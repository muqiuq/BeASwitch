//! Ethernet MAC addresses.

use crate::rng::Rng;
use core::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct MacAddress([u8; 6]);

impl MacAddress {
    pub const fn new(octets: [u8; 6]) -> Self {
        Self(octets)
    }

    pub const fn octets(&self) -> [u8; 6] {
        self.0
    }

    pub const BROADCAST: MacAddress = MacAddress([0xFF; 6]);

    pub fn is_broadcast(&self) -> bool {
        self.0 == [0xFF; 6]
    }

    pub fn is_multicast(&self) -> bool {
        self.0[0] & 0x01 != 0
    }

    /// Accepts `:` or `-` separators and any casing.
    pub fn parse(text: &str) -> Option<Self> {
        let cleaned = text.trim().replace('-', ":");
        let parts: Vec<&str> = cleaned.split(':').collect();
        if parts.len() != 6 {
            return None;
        }
        let mut octets = [0u8; 6];
        for (i, part) in parts.iter().enumerate() {
            if part.len() > 2 || part.is_empty() {
                return None;
            }
            octets[i] = u8::from_str_radix(part, 16).ok()?;
        }
        Some(Self(octets))
    }

    pub fn random(rng: &mut Rng) -> Self {
        let mut octets = [0u8; 6];
        rng.fill_bytes(&mut octets);
        // Clear the multicast bit so generated addresses are valid source MACs.
        octets[0] &= 0xFE;
        Self(octets)
    }
}

impl fmt::Display for MacAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let o = self.0;
        write!(
            f,
            "{:02X}:{:02X}:{:02X}:{:02X}:{:02X}:{:02X}",
            o[0], o[1], o[2], o[3], o[4], o[5]
        )
    }
}

#[cfg(test)]
mod tests {
    use super::MacAddress;
    use crate::rng::Rng;

    #[test]
    fn round_trips_through_text() {
        let mac = MacAddress::parse("00:13:AB:AB:10:01").unwrap();
        assert_eq!(mac.to_string(), "00:13:AB:AB:10:01");
    }

    #[test]
    fn accepts_dashes_and_lowercase() {
        let a = MacAddress::parse("aa-bb-cc-dd-ee-ff").unwrap();
        let b = MacAddress::parse("AA:BB:CC:DD:EE:FF").unwrap();
        assert_eq!(a, b);
    }

    #[test]
    fn rejects_malformed_input() {
        assert!(MacAddress::parse("00:13:AB:AB:10").is_none());
        assert!(MacAddress::parse("00:13:AB:AB:10:01:02").is_none());
        assert!(MacAddress::parse("zz:13:AB:AB:10:01").is_none());
        assert!(MacAddress::parse("").is_none());
    }

    #[test]
    fn random_macs_are_unicast() {
        let mut rng = Rng::new(4);
        for _ in 0..1000 {
            assert!(!MacAddress::random(&mut rng).is_multicast());
        }
    }
}
