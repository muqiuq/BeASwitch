//! IPv4 addressing and subnet maths.
//!
//! Ported from `BeARouter/IPv4Address.cs` and `BeARouter/Subnet.cs`.

use crate::rng::Rng;
use core::fmt;
use std::net::Ipv4Addr;
use std::str::FromStr;

pub const V4_BITS: u8 = 32;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct InvalidMask(pub u8);

impl fmt::Display for InvalidMask {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "invalid IPv4 prefix length /{}", self.0)
    }
}

/// Contiguous prefix mask as a big-endian u32, e.g. `/24` -> `0xFFFFFF00`.
pub fn mask_to_u32(mask: u8) -> Result<u32, InvalidMask> {
    if mask > V4_BITS {
        return Err(InvalidMask(mask));
    }
    if mask == 0 {
        return Ok(0);
    }
    Ok(u32::MAX << (V4_BITS - mask))
}

pub fn mask_to_bytes(mask: u8) -> Result<[u8; 4], InvalidMask> {
    Ok(mask_to_u32(mask)?.to_be_bytes())
}

pub fn inverted_mask(mask: u8) -> Result<[u8; 4], InvalidMask> {
    Ok((!mask_to_u32(mask)?).to_be_bytes())
}

/// Dotted-decimal form of a prefix length, e.g. `/24` -> `255.255.255.0`.
pub fn mask_to_dotted(mask: u8) -> Result<Ipv4Addr, InvalidMask> {
    Ok(Ipv4Addr::from(mask_to_u32(mask)?))
}

/// Inverse of [`mask_to_dotted`]. Rejects non-contiguous masks such as `255.0.255.0`.
pub fn dotted_to_mask(addr: Ipv4Addr) -> Option<u8> {
    let bits = u32::from(addr);
    let ones = bits.leading_ones();
    if ones == 32 || bits << ones == 0 {
        Some(ones as u8)
    } else {
        None
    }
}

pub fn increment_one(addr: Ipv4Addr) -> Ipv4Addr {
    Ipv4Addr::from(u32::from(addr).wrapping_add(1))
}

pub fn increment_by(addr: Ipv4Addr, skip: i64) -> Ipv4Addr {
    Ipv4Addr::from(u32::from(addr).wrapping_add(skip as u32))
}

/// An IPv4 address paired with a prefix length. The address is *not* normalised
/// to the network address, matching the original `Subnet` class.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct SubnetV4 {
    pub address: Ipv4Addr,
    pub mask: u8,
}

impl SubnetV4 {
    pub fn new(address: Ipv4Addr, mask: u8) -> Result<Self, InvalidMask> {
        if mask > V4_BITS {
            return Err(InvalidMask(mask));
        }
        Ok(Self { address, mask })
    }

    pub fn parse(text: &str) -> Option<Self> {
        let (addr, mask) = text.split_once('/')?;
        let address = Ipv4Addr::from_str(addr.trim()).ok()?;
        let mask = mask.trim().parse::<u8>().ok()?;
        Self::new(address, mask).ok()
    }

    pub fn network_address(&self) -> Ipv4Addr {
        let mask = mask_to_u32(self.mask).unwrap_or(u32::MAX);
        Ipv4Addr::from(u32::from(self.address) & mask)
    }

    pub fn broadcast(&self) -> Ipv4Addr {
        let mask = mask_to_u32(self.mask).unwrap_or(u32::MAX);
        Ipv4Addr::from(u32::from(self.address) | !mask)
    }

    /// The subnet rebased onto its network address.
    pub fn to_network(&self) -> Self {
        Self {
            address: self.network_address(),
            mask: self.mask,
        }
    }

    pub fn host_min(&self) -> Ipv4Addr {
        increment_one(self.network_address())
    }

    pub fn host_max(&self) -> Ipv4Addr {
        Ipv4Addr::from(u32::from(self.broadcast()).wrapping_sub(1))
    }

    /// `2^(32-mask) - 2`. Negative for `/32`, matching `Subnet.NumOfHostAddress`.
    pub fn num_of_host_addresses(&self) -> i64 {
        (1i64 << (V4_BITS - self.mask)) - 2
    }

    pub fn total_addresses(&self) -> u64 {
        1u64 << (V4_BITS - self.mask)
    }

    pub fn is_network_address(&self) -> bool {
        self.network_address() == self.address
    }

    pub fn is_broadcast(&self) -> bool {
        self.broadcast() == self.address
    }

    pub fn is_host_address(&self) -> bool {
        !self.is_network_address() && !self.is_broadcast()
    }

    pub fn is_default_route(&self) -> bool {
        self.mask == 0 && u32::from(self.address) == 0
    }

    /// True when `other` falls inside this subnet.
    pub fn matches(&self, other: Ipv4Addr) -> bool {
        let mask = mask_to_u32(self.mask).unwrap_or(u32::MAX);
        (u32::from(other) & mask) == u32::from(self.network_address())
    }

    /// The network address `other` produces under this subnet's mask. Shown in
    /// the Explain view so students can see the masking step.
    pub fn apply_mask_to(&self, other: Ipv4Addr) -> Ipv4Addr {
        let mask = mask_to_u32(self.mask).unwrap_or(u32::MAX);
        Ipv4Addr::from(u32::from(other) & mask)
    }

    pub fn contains_subnet(&self, other: &SubnetV4) -> bool {
        other.mask >= self.mask && self.matches(other.network_address())
    }

    /// Flips the least significant bit that still lies inside the mask.
    /// Ported from `Subnet.GenerateNewWithLowestBitWithinMaskIncreased`.
    pub fn with_lowest_masked_bit_set(&self) -> Self {
        if self.mask == 0 {
            return *self;
        }
        let bit = 1u32 << (V4_BITS - self.mask);
        Self {
            address: Ipv4Addr::from(u32::from(self.address) | bit),
            mask: self.mask,
        }
    }

    pub fn apply_or(&self, bits: u32) -> Self {
        Self {
            address: Ipv4Addr::from(u32::from(self.address) | bits),
            mask: self.mask,
        }
    }

    /// Splits this subnet into equally sized blocks of `new_mask`.
    pub fn split(&self, new_mask: u8) -> Vec<SubnetV4> {
        if new_mask <= self.mask || new_mask > V4_BITS {
            return Vec::new();
        }
        let count = 1u64 << (new_mask - self.mask);
        let step = 1u64 << (V4_BITS - new_mask);
        let base = u32::from(self.network_address()) as u64;
        (0..count)
            .map(|i| SubnetV4 {
                address: Ipv4Addr::from((base + i * step) as u32),
                mask: new_mask,
            })
            .collect()
    }

    pub fn number_of_subnets(&self, new_mask: u8) -> u64 {
        if new_mask <= self.mask || new_mask > V4_BITS {
            0
        } else {
            1u64 << (new_mask - self.mask)
        }
    }

    /// A random usable host address inside the subnet.
    pub fn random_host(&self, rng: &mut Rng) -> Ipv4Addr {
        let total = self.total_addresses();
        if total <= 2 {
            return self.network_address();
        }
        let offset = rng.range(1, (total - 1) as i64) as u32;
        Ipv4Addr::from(u32::from(self.network_address()) + offset)
    }
}

impl fmt::Display for SubnetV4 {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}/{}", self.address, self.mask)
    }
}

const PRIVATE_FIRST_OCTETS: [u8; 6] = [10, 100, 127, 169, 172, 192];

/// Random RFC1918 or public subnet, mirroring `Helper.GetRandomIPv4Subnet`.
pub fn random_ipv4_subnet(rng: &mut Rng, min_cidr: u8, max_cidr: u8) -> SubnetV4 {
    match rng.range(0, 3) {
        0 => {
            let mask = pick_mask(rng, min_cidr.max(16), max_cidr.min(28));
            SubnetV4 {
                address: Ipv4Addr::new(
                    192,
                    168,
                    rng.range(0, 255) as u8,
                    rng.range(2, 254) as u8,
                ),
                mask,
            }
        }
        1 => {
            let mask = pick_mask(rng, min_cidr.max(8), max_cidr.min(28));
            SubnetV4 {
                address: Ipv4Addr::new(
                    10,
                    rng.range(0, 255) as u8,
                    rng.range(0, 255) as u8,
                    rng.range(2, 254) as u8,
                ),
                mask,
            }
        }
        _ => random_public_ipv4_subnet(rng, min_cidr, max_cidr),
    }
}

/// Mirrors `Helper.GetRandomPublicIPv4Subnet`, avoiding reserved first octets.
pub fn random_public_ipv4_subnet(rng: &mut Rng, min_cidr: u8, max_cidr: u8) -> SubnetV4 {
    let mut first = rng.range(1, 197) as u8;
    if PRIVATE_FIRST_OCTETS.contains(&first) {
        first += 1;
    }
    let mask = pick_mask(rng, min_cidr.max(16), max_cidr.min(28));
    SubnetV4 {
        address: Ipv4Addr::new(
            first,
            rng.range(0, 254) as u8,
            rng.range(0, 254) as u8,
            rng.range(0, 254) as u8,
        ),
        mask,
    }
}

fn pick_mask(rng: &mut Rng, low: u8, high: u8) -> u8 {
    if high <= low {
        low.min(V4_BITS)
    } else {
        rng.range(low as i64, high as i64) as u8
    }
}

pub fn random_ipv4_address(rng: &mut Rng) -> Ipv4Addr {
    random_public_ipv4_subnet(rng, 16, 28).address
}
