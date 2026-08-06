//! Ported from `BeARouter.Test/SupnetIpV6Test.cs`.

use net_core::mac::MacAddress;
use net_core::v6::{self, SubnetV6};
use std::net::Ipv6Addr;

fn ip(s: &str) -> Ipv6Addr {
    v6::parse(s).expect("valid IPv6")
}

fn matches(network: &str, mask: u8, address: &str) -> bool {
    SubnetV6::new(ip(network), mask)
        .expect("valid mask")
        .matches(ip(address))
}

#[test]
fn increment_one() {
    assert_eq!(v6::increment_one(ip("2001:DB8::")).to_string(), "2001:db8::1");
    assert_eq!(
        v6::increment_one(ip("2001:DB8::FF")).to_string(),
        "2001:db8::100"
    );
    assert_eq!(
        v6::increment_one(ip("2001:DB8::FFFF")).to_string(),
        "2001:db8::1:0"
    );
}

#[test]
fn increment_by() {
    let base = ip("2001:DB8::");
    assert_eq!(v6::increment_by(base, 300).to_string(), "2001:db8::12c");
    assert_eq!(v6::increment_by(base, 65536).to_string(), "2001:db8::1:0");
    assert_eq!(v6::increment_by(base, 65535).to_string(), "2001:db8::ffff");
    assert_eq!(
        v6::increment_by(base, 4_294_967_295).to_string(),
        "2001:db8::ffff:ffff"
    );
}

#[test]
fn network_address() {
    assert_eq!(
        SubnetV6::new(ip("2001:DB8::1"), 64).unwrap().network_address().to_string(),
        "2001:db8::"
    );
    assert_eq!(
        SubnetV6::new(ip("2001:DB8::1:FFFF:FFFF:FFFF:FFFF"), 64)
            .unwrap()
            .network_address()
            .to_string(),
        "2001:db8:0:1::"
    );
    assert_eq!(
        SubnetV6::new(ip("2BCD::FACE:1:BEFF:FEBE:CAFE"), 56)
            .unwrap()
            .network_address()
            .to_string(),
        "2bcd:0:0:fa00::"
    );
}

#[test]
fn subnet_match() {
    assert!(matches(
        "2001:db8:0:1::",
        64,
        "2001:DB8::1:FFFF:FFFF:FFFF:FFFF"
    ));
    assert!(!matches(
        "2001:db8:0:1::",
        128,
        "2001:DB8::1:FFFF:FFFF:FFFF:FFFF"
    ));
    assert!(matches("::", 0, "2001:DB8::1:FFFF:FFFF:FFFF:FFFF"));
    assert!(matches("3124:0:0:DEA0::", 60, "3124::DEAD:CAFE:FF:FE00:1"));
}

#[test]
fn expand() {
    assert_eq!(
        v6::expand(ip("2001:DB8::1:FFFF:FFFF:FFFF:FFFF")),
        "2001:0db8:0000:0001:ffff:ffff:ffff:ffff"
    );
    assert_eq!(
        v6::expand(ip("2340:0:10:100:1000:ABCD:101:1010")),
        "2340:0000:0010:0100:1000:abcd:0101:1010"
    );
    assert_eq!(
        v6::expand(ip("FE80::DEAD:BEFF:FEEF:CAFE")),
        "fe80:0000:0000:0000:dead:beff:feef:cafe"
    );
}

#[test]
fn expand_and_abbreviate_round_trip() {
    let addresses = [
        "2001:db8::1",
        "::",
        "::1",
        "2001:db8:0:1::",
        "fe80::dead:beff:feef:cafe",
        "2bcd:0:0:fa00::",
    ];
    for text in addresses {
        let addr = ip(text);
        assert_eq!(ip(&v6::expand(addr)), addr, "{text}");
        assert_eq!(v6::abbreviate(addr), addr.to_string(), "{text}");
    }
}

#[test]
fn eui64() {
    let subnet = SubnetV6::new(ip("2001:DB8:1:1::"), 64).unwrap();
    assert_eq!(
        subnet.eui64(MacAddress::parse("00:13:AB:AB:10:01").unwrap()).to_string(),
        "2001:db8:1:1:213:abff:feab:1001"
    );
    assert_eq!(
        subnet.eui64(MacAddress::parse("00:0C:BE:EF:CA:FE").unwrap()).to_string(),
        "2001:db8:1:1:20c:beff:feef:cafe"
    );
}

#[test]
fn eui64_always_lands_inside_its_prefix() {
    let mut rng = net_core::Rng::new(1234);
    for _ in 0..2000 {
        let subnet = v6::random_ipv6_subnet(&mut rng, 64, 64, 0);
        let network = subnet.to_network();
        let address = subnet.eui64(MacAddress::random(&mut rng));
        assert!(network.matches(address), "{network} does not contain {address}");
    }
}

#[test]
fn eui64_flips_the_universal_local_bit() {
    let subnet = SubnetV6::new(ip("2001:db8::"), 64).unwrap();
    let address = subnet.eui64(MacAddress::parse("02:00:00:00:00:00").unwrap());
    assert_eq!(address.octets()[8], 0x00);
    let address = subnet.eui64(MacAddress::parse("00:00:00:00:00:00").unwrap());
    assert_eq!(address.octets()[8], 0x02);
    assert_eq!(address.octets()[11], 0xFF);
    assert_eq!(address.octets()[12], 0xFE);
}

#[test]
fn number_of_subnets() {
    let subnet = SubnetV6::new(ip("2001:db8::"), 48).unwrap();
    assert_eq!(subnet.number_of_subnets(64), 65536);
    assert_eq!(subnet.number_of_subnets(48), 1);
    assert_eq!(subnet.number_of_subnets(47), 0);
    assert_eq!(
        SubnetV6::new(ip("2001:db8::"), 32).unwrap().number_of_subnets(64),
        4_294_967_296
    );
}

#[test]
fn host_counts() {
    assert_eq!(
        SubnetV6::new(ip("2001:db8::"), 64).unwrap().num_of_host_addresses(),
        18_446_744_073_709_551_616
    );
    assert_eq!(
        SubnetV6::new(ip("2001:db8::"), 128).unwrap().num_of_host_addresses(),
        1
    );
}

#[test]
fn alternative_abbreviation() {
    assert_eq!(
        v6::alternative_abbreviation(ip("2bcd:0:0:fa00::")),
        "2bcd::0:fa00::"
    );
    assert_eq!(v6::alternative_abbreviation(ip("2001:db8::1")), "2001:db8::1");
}

#[test]
fn same_address_ignores_spelling() {
    assert!(v6::same_address(
        "2001:DB8::1",
        "2001:0db8:0000:0000:0000:0000:0000:0001"
    ));
    assert!(v6::same_address(" 2001:db8::1 ", "2001:DB8:0:0::1"));
    assert!(!v6::same_address("2001:db8::1", "2001:db8::2"));
    assert!(!v6::same_address("garbage", "2001:db8::1"));
}

#[test]
fn parse_accepts_cidr_notation() {
    let subnet = SubnetV6::parse("2001:db8::/32").unwrap();
    assert_eq!(subnet.mask, 32);
    assert_eq!(subnet.to_string(), "2001:db8::/32");
    assert!(SubnetV6::parse("2001:db8::/129").is_none());
    assert!(SubnetV6::parse("2001:db8::").is_none());
}

#[test]
fn splitting_produces_contiguous_prefixes() {
    let subnet = SubnetV6::new(ip("2001:db8::"), 48).unwrap();
    let blocks = subnet.split(52);
    assert_eq!(blocks.len(), 16);
    assert_eq!(blocks[0].address.to_string(), "2001:db8::");
    assert_eq!(blocks[1].address.to_string(), "2001:db8:0:1000::");
    assert!(subnet.split(48).is_empty());
}

#[test]
fn random_subnets_are_well_formed() {
    let mut rng = net_core::Rng::new(555);
    for _ in 0..2000 {
        let subnet = v6::random_ipv6_subnet(&mut rng, 32, 64, 2);
        assert!((32..64).contains(&subnet.mask) || subnet.mask == 32);
        assert!(subnet.to_network().matches(subnet.address));
    }
}
