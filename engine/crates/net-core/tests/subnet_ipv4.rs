//! Ported from `BeARouter.Test/SubnetIpTests.cs`.

use net_core::v4::{self, SubnetV4};
use std::net::Ipv4Addr;

fn ip(s: &str) -> Ipv4Addr {
    s.parse().expect("valid IPv4")
}

fn matches(network: &str, mask: u8, address: &str) -> bool {
    SubnetV4::new(ip(network), mask)
        .expect("valid mask")
        .matches(ip(address))
}

#[test]
fn mask_to_address() {
    assert_eq!(v4::mask_to_bytes(3).unwrap(), [224, 0, 0, 0]);
    assert_eq!(v4::mask_to_bytes(6).unwrap(), [252, 0, 0, 0]);
    assert_eq!(v4::mask_to_bytes(9).unwrap(), [255, 128, 0, 0]);
    assert_eq!(v4::mask_to_bytes(24).unwrap(), [255, 255, 255, 0]);
    assert_eq!(v4::mask_to_bytes(32).unwrap(), [255, 255, 255, 255]);
    assert_eq!(v4::mask_to_bytes(0).unwrap(), [0, 0, 0, 0]);
}

#[test]
fn mask_out_of_range_is_rejected() {
    assert!(v4::mask_to_bytes(33).is_err());
    assert!(SubnetV4::new(ip("10.0.0.0"), 33).is_err());
}

#[test]
fn subnet_map_tests() {
    assert!(matches("192.168.1.0", 24, "192.168.1.5"));
    assert!(!matches("192.168.0.0", 24, "192.168.1.5"));
    assert!(matches("0.0.0.0", 0, "192.168.1.5"));
    assert!(matches("0.0.0.0", 0, "255.255.255.255"));
    assert!(matches("10.0.0.0", 8, "10.3.2.23"));
    assert!(matches("10.0.0.0", 9, "10.3.2.23"));
    assert!(matches("10.2.0.0", 15, "10.3.2.23"));
    assert!(matches("10.2.0.0", 15, "10.2.255.255"));
    assert!(matches("192.168.10.0", 24, "192.168.10.0"));
    assert!(matches("192.168.10.0", 24, "192.168.10.1"));
    assert!(matches("192.168.10.0", 24, "192.168.10.255"));
    assert!(!matches("192.168.10.0", 24, "192.168.11.255"));
}

#[test]
fn increment_overflow() {
    assert_eq!(v4::increment_one(ip("192.168.1.255")), ip("192.168.2.0"));
    assert_eq!(v4::increment_one(ip("192.255.255.255")), ip("193.0.0.0"));
    assert_eq!(v4::increment_one(ip("255.255.255.255")), ip("0.0.0.0"));

    let mut address = ip("0.0.0.0");
    for _ in 0..256 {
        address = v4::increment_one(address);
    }
    assert_eq!(address, ip("0.0.1.0"));
}

#[test]
fn increment_by() {
    assert_eq!(v4::increment_by(ip("192.168.1.100"), 100), ip("192.168.1.200"));
    assert_eq!(v4::increment_by(ip("192.168.1.100"), 200), ip("192.168.2.44"));
    assert_eq!(v4::increment_by(ip("192.168.1.100"), 457), ip("192.168.3.45"));
    assert_eq!(
        v4::increment_by(ip("192.168.1.100"), 65536),
        ip("192.169.1.100")
    );
}

#[test]
fn network_and_broadcast() {
    let subnet = SubnetV4::new(ip("192.168.10.130"), 26).unwrap();
    assert_eq!(subnet.network_address(), ip("192.168.10.128"));
    assert_eq!(subnet.broadcast(), ip("192.168.10.191"));
    assert_eq!(subnet.host_min(), ip("192.168.10.129"));
    assert_eq!(subnet.host_max(), ip("192.168.10.190"));
    assert_eq!(subnet.num_of_host_addresses(), 62);
    assert!(subnet.is_host_address());
}

#[test]
fn host_counts_match_the_original_formula() {
    let cases = [(24u8, 254i64), (30, 2), (31, 0), (32, -1), (16, 65534)];
    for (mask, expected) in cases {
        let subnet = SubnetV4::new(ip("10.0.0.0"), mask).unwrap();
        assert_eq!(subnet.num_of_host_addresses(), expected, "/{mask}");
    }
    assert_eq!(
        SubnetV4::new(ip("0.0.0.0"), 0).unwrap().num_of_host_addresses(),
        4_294_967_294
    );
}

#[test]
fn network_and_broadcast_classification() {
    let network = SubnetV4::new(ip("192.168.1.0"), 24).unwrap();
    assert!(network.is_network_address());
    assert!(!network.is_broadcast());
    assert!(!network.is_host_address());

    let broadcast = SubnetV4::new(ip("192.168.1.255"), 24).unwrap();
    assert!(broadcast.is_broadcast());
    assert!(!broadcast.is_host_address());
}

#[test]
fn dotted_mask_conversion_round_trips() {
    for mask in 0..=32u8 {
        let dotted = v4::mask_to_dotted(mask).unwrap();
        assert_eq!(v4::dotted_to_mask(dotted), Some(mask), "/{mask}");
    }
    assert_eq!(v4::mask_to_dotted(24).unwrap(), ip("255.255.255.0"));
    assert_eq!(v4::mask_to_dotted(26).unwrap(), ip("255.255.255.192"));
    assert_eq!(v4::dotted_to_mask(ip("255.255.254.0")), Some(23));
}

#[test]
fn non_contiguous_masks_are_rejected() {
    assert_eq!(v4::dotted_to_mask(ip("255.0.255.0")), None);
    assert_eq!(v4::dotted_to_mask(ip("255.255.255.1")), None);
}

#[test]
fn lowest_masked_bit_is_flipped() {
    let subnet = SubnetV4::new(ip("192.168.0.0"), 24).unwrap();
    assert_eq!(
        subnet.with_lowest_masked_bit_set().address,
        ip("192.168.1.0")
    );
    let wide = SubnetV4::new(ip("10.0.0.0"), 8).unwrap();
    assert_eq!(wide.with_lowest_masked_bit_set().address, ip("11.0.0.0"));
}

#[test]
fn splitting_produces_contiguous_blocks() {
    let subnet = SubnetV4::new(ip("192.168.1.0"), 24).unwrap();
    let blocks = subnet.split(26);
    assert_eq!(blocks.len(), 4);
    assert_eq!(subnet.number_of_subnets(26), 4);
    assert_eq!(blocks[0].address, ip("192.168.1.0"));
    assert_eq!(blocks[1].address, ip("192.168.1.64"));
    assert_eq!(blocks[2].address, ip("192.168.1.128"));
    assert_eq!(blocks[3].address, ip("192.168.1.192"));
    assert!(subnet.split(24).is_empty());
    assert!(subnet.split(20).is_empty());
}

#[test]
fn parse_accepts_cidr_notation() {
    let subnet = SubnetV4::parse("192.168.1.10/24").unwrap();
    assert_eq!(subnet.address, ip("192.168.1.10"));
    assert_eq!(subnet.mask, 24);
    assert_eq!(subnet.to_string(), "192.168.1.10/24");
    assert!(SubnetV4::parse("192.168.1.10").is_none());
    assert!(SubnetV4::parse("192.168.1.10/33").is_none());
    assert!(SubnetV4::parse("nonsense/24").is_none());
}

#[test]
fn default_route_is_recognised() {
    assert!(SubnetV4::parse("0.0.0.0/0").unwrap().is_default_route());
    assert!(!SubnetV4::parse("10.0.0.0/8").unwrap().is_default_route());
}

#[test]
fn random_subnets_are_well_formed() {
    let mut rng = net_core::Rng::new(2024);
    for _ in 0..2000 {
        let subnet = v4::random_ipv4_subnet(&mut rng, 8, 28);
        assert!(subnet.mask <= 32);
        let host = subnet.random_host(&mut rng);
        assert!(subnet.matches(host));
    }
}

#[test]
fn random_public_subnets_avoid_reserved_ranges() {
    let mut rng = net_core::Rng::new(11);
    for _ in 0..5000 {
        let first = v4::random_public_ipv4_subnet(&mut rng, 16, 28).address.octets()[0];
        assert!(
            ![10, 100, 127, 169, 172, 192].contains(&first),
            "reserved first octet {first}"
        );
    }
}
