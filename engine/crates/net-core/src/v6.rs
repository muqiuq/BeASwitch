//! IPv6 addressing, prefix maths and EUI-64.
//!
//! Ported from `BeARouter/IPv6Address.cs` and `BeARouter/SubnetV6.cs`.

use crate::mac::MacAddress;
use crate::rng::Rng;
use crate::v4::InvalidMask;
use core::fmt;
use std::net::Ipv6Addr;
use std::str::FromStr;

pub const V6_BITS: u8 = 128;

pub fn mask_to_u128(mask: u8) -> Result<u128, InvalidMask> {
    if mask > V6_BITS {
        return Err(InvalidMask(mask));
    }
    if mask == 0 {
        return Ok(0);
    }
    Ok(u128::MAX << (V6_BITS - mask))
}

pub fn increment_one(addr: Ipv6Addr) -> Ipv6Addr {
    Ipv6Addr::from(u128::from(addr).wrapping_add(1))
}

pub fn increment_by(addr: Ipv6Addr, skip: u128) -> Ipv6Addr {
    Ipv6Addr::from(u128::from(addr).wrapping_add(skip))
}

/// Fully expanded lowercase form, e.g. `2001:0db8:0000:0001:ffff:ffff:ffff:ffff`.
pub fn expand(addr: Ipv6Addr) -> String {
    addr.segments()
        .iter()
        .map(|group| format!("{group:04x}"))
        .collect::<Vec<_>>()
        .join(":")
}

/// The compressed RFC 5952 form produced by `Ipv6Addr`'s `Display`.
pub fn abbreviate(addr: Ipv6Addr) -> String {
    addr.to_string()
}

/// Ported from `IPv6Address.GetAlternativeAbbreviation`; accepted as an
/// alternative answer because some textbooks compress a single zero group.
pub fn alternative_abbreviation(addr: Ipv6Addr) -> String {
    addr.to_string().replace(":0:", "::")
}

/// Parses any accepted textual IPv6 form, tolerating case and whitespace.
pub fn parse(text: &str) -> Option<Ipv6Addr> {
    Ipv6Addr::from_str(text.trim()).ok()
}

/// Compares two textual IPv6 addresses by value rather than spelling, so
/// `2001:DB8::1` and `2001:0db8:0000:0000:0000:0000:0000:0001` are equal.
pub fn same_address(a: &str, b: &str) -> bool {
    match (parse(a), parse(b)) {
        (Some(x), Some(y)) => x == y,
        _ => false,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct SubnetV6 {
    pub address: Ipv6Addr,
    pub mask: u8,
}

impl SubnetV6 {
    pub fn new(address: Ipv6Addr, mask: u8) -> Result<Self, InvalidMask> {
        if mask > V6_BITS {
            return Err(InvalidMask(mask));
        }
        Ok(Self { address, mask })
    }

    pub fn parse(text: &str) -> Option<Self> {
        let (addr, mask) = text.split_once('/')?;
        let address = Ipv6Addr::from_str(addr.trim()).ok()?;
        let mask = mask.trim().parse::<u8>().ok()?;
        Self::new(address, mask).ok()
    }

    pub fn network_address(&self) -> Ipv6Addr {
        let mask = mask_to_u128(self.mask).unwrap_or(u128::MAX);
        Ipv6Addr::from(u128::from(self.address) & mask)
    }

    pub fn last_address(&self) -> Ipv6Addr {
        let mask = mask_to_u128(self.mask).unwrap_or(u128::MAX);
        Ipv6Addr::from(u128::from(self.address) | !mask)
    }

    pub fn to_network(&self) -> Self {
        Self {
            address: self.network_address(),
            mask: self.mask,
        }
    }

    pub fn host_min(&self) -> Ipv6Addr {
        increment_one(self.network_address())
    }

    pub fn is_network_address(&self) -> bool {
        self.network_address() == self.address
    }

    /// `2^(128-mask)`. IPv6 has no broadcast address to subtract.
    pub fn num_of_host_addresses(&self) -> u128 {
        if self.mask == 0 {
            u128::MAX
        } else {
            1u128 << (V6_BITS - self.mask)
        }
    }

    /// Ported from `SubnetV6.NumberOfSubnets`; how many `max_cidr` blocks fit.
    pub fn number_of_subnets(&self, max_cidr: u8) -> u128 {
        if self.mask > max_cidr || max_cidr > V6_BITS {
            0
        } else {
            1u128 << (max_cidr - self.mask)
        }
    }

    pub fn matches(&self, other: Ipv6Addr) -> bool {
        let mask = mask_to_u128(self.mask).unwrap_or(u128::MAX);
        (u128::from(other) & mask) == u128::from(self.network_address())
    }

    pub fn split(&self, new_mask: u8) -> Vec<SubnetV6> {
        if new_mask <= self.mask || new_mask > V6_BITS || new_mask - self.mask > 16 {
            return Vec::new();
        }
        let count = 1u128 << (new_mask - self.mask);
        let step = 1u128 << (V6_BITS - new_mask);
        let base = u128::from(self.network_address());
        (0..count)
            .map(|i| SubnetV6 {
                address: Ipv6Addr::from(base + i * step),
                mask: new_mask,
            })
            .collect()
    }

    /// RFC 4291 modified EUI-64: the MAC's OUI has bit 1 of its first octet
    /// flipped, then `FF:FE` is inserted in the middle.
    pub fn eui64(&self, mac: MacAddress) -> Ipv6Addr {
        let m = mac.octets();
        let interface_id: [u8; 8] = [
            m[0] ^ 0x02,
            m[1],
            m[2],
            0xFF,
            0xFE,
            m[3],
            m[4],
            m[5],
        ];
        let mut bytes = self.address.octets();
        bytes[8..16].copy_from_slice(&interface_id);
        Ipv6Addr::from(bytes)
    }
}

impl fmt::Display for SubnetV6 {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}/{}", self.address, self.mask)
    }
}

/// Random documentation-range prefix, mirroring `Helper.GetRandomIPv6Subnet`.
///
/// `zero_group_run` blanks that many *consecutive* 16-bit groups. RFC 5952
/// never compresses a lone zero group, so a run of at least two is required
/// for the address to be abbreviable at all.
pub fn random_ipv6_subnet(
    rng: &mut Rng,
    min_cidr: u8,
    max_cidr: u8,
    zero_group_run: usize,
) -> SubnetV6 {
    let mut bytes = Ipv6Addr::new(0x2001, 0x0db8, 0x0001, 0, 0, 0, 0, 0).octets();

    let mut min_byte_to_set = (min_cidr / 8) as usize;
    if min_cidr % 8 != 0 {
        min_byte_to_set += 1;
    }

    let mut random_bytes = [0u8; 16];
    rng.fill_bytes(&mut random_bytes);
    for a in min_byte_to_set..16 {
        bytes[a] = random_bytes[a];
    }

    let first_group = min_byte_to_set.div_ceil(2);
    if zero_group_run > 0 && first_group < 8 {
        let run = zero_group_run.min(8 - first_group);
        let start = rng.range(first_group as i64, (8 - run + 1) as i64) as usize;
        for group in start..start + run {
            bytes[group * 2] = 0;
            bytes[group * 2 + 1] = 0;
        }
    }

    let mask = if max_cidr <= min_cidr {
        min_cidr
    } else {
        rng.range(min_cidr as i64, max_cidr as i64) as u8
    };

    SubnetV6 {
        address: Ipv6Addr::from(bytes),
        mask,
    }
}
