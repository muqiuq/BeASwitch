//! Property tests: every generator must produce solvable, self-consistent
//! questions across thousands of seeds.

use net_core::v4::{self, SubnetV4};
use net_core::v6::{self, SubnetV6};
use net_core::{MacAddress, Rng};
use quiz_engine::question::{Category, InputType, Matcher, QuestionKind};
use quiz_engine::types::{IPV6_PREFIXES, REGISTRY};

const SAMPLES: usize = 1000;

#[test]
fn the_registry_covers_every_question_kind() {
    let kinds = [
        QuestionKind::NetworkAddress,
        QuestionKind::Broadcast,
        QuestionKind::NumberOfHosts,
        QuestionKind::SplitSubnetSecond,
        QuestionKind::SplitSubnetThird,
        QuestionKind::CidrToDotted,
        QuestionKind::DottedToCidr,
        QuestionKind::AbbreviateIpv6,
        QuestionKind::ExpandIpv6,
        QuestionKind::Ipv6Prefix,
        QuestionKind::Eui64,
        QuestionKind::NumberOfIpv6Subnets,
    ];
    assert_eq!(REGISTRY.len(), kinds.len());
    for kind in kinds {
        assert!(
            REGISTRY.iter().any(|r| r.kind == kind),
            "{kind:?} is missing from the registry"
        );
    }
}

#[test]
fn split_subnet_questions_are_asked_twice_as_often() {
    for registration in REGISTRY {
        let expected = match registration.kind {
            QuestionKind::SplitSubnetSecond | QuestionKind::SplitSubnetThird => 2,
            _ => 1,
        };
        assert_eq!(registration.frequency, expected, "{:?}", registration.kind);
    }
}

#[test]
fn every_generator_accepts_its_own_answer() {
    for registration in REGISTRY {
        let mut rng = Rng::new(0xC0FFEE);
        for sample in 0..SAMPLES {
            let question = (registration.generate)(&mut rng);
            assert!(
                question.evaluate(&question.answer),
                "{:?} sample {sample}: rejected its own answer {:?}",
                registration.kind,
                question.answer
            );
        }
    }
}

#[test]
fn every_generator_is_internally_consistent() {
    for registration in REGISTRY {
        let mut rng = Rng::new(7);
        for sample in 0..SAMPLES {
            let question = (registration.generate)(&mut rng);
            let label = format!("{:?} sample {sample}", registration.kind);

            assert_eq!(question.kind, registration.kind, "{label}");
            assert_eq!(question.category, registration.category, "{label}");
            assert!(!question.subject.is_empty(), "{label}: empty subject");
            assert!(!question.answer.is_empty(), "{label}: empty answer");

            match question.input_type {
                InputType::Text => {
                    assert!(question.options.is_empty(), "{label}: text question has options");
                }
                InputType::SingleChoice => {
                    assert_eq!(question.options.len(), 4, "{label}: needs four options");
                    assert!(
                        question.options.contains(&question.answer),
                        "{label}: the answer is not among the options"
                    );
                    let mut unique = question.options.clone();
                    unique.sort();
                    unique.dedup();
                    assert_eq!(unique.len(), 4, "{label}: duplicate options");
                }
            }
        }
    }
}

#[test]
fn wrong_answers_are_rejected() {
    for registration in REGISTRY {
        let mut rng = Rng::new(31);
        for sample in 0..SAMPLES {
            let question = (registration.generate)(&mut rng);
            let label = format!("{:?} sample {sample}", registration.kind);

            assert!(!question.evaluate(""), "{label}: accepted an empty answer");
            assert!(
                !question.evaluate("definitely not the answer"),
                "{label}: accepted nonsense"
            );

            match question.input_type {
                InputType::SingleChoice => {
                    for option in question.options.iter().filter(|o| **o != question.answer) {
                        assert!(
                            !question.evaluate(option),
                            "{label}: accepted the distractor {option:?}"
                        );
                    }
                }
                InputType::Text => {
                    let mutated = mutate(&question.answer, question.matcher);
                    assert!(
                        !question.evaluate(&mutated),
                        "{label}: accepted mutated answer {mutated:?} for {:?}",
                        question.answer
                    );
                }
            }
        }
    }
}

/// Produces a plausible but wrong answer of the same shape.
fn mutate(answer: &str, matcher: Matcher) -> String {
    match matcher {
        Matcher::Integer => match answer.parse::<i128>() {
            Ok(value) => (value + 1).to_string(),
            Err(_) => format!("{answer}1"),
        },
        Matcher::Ipv4 => match answer.parse::<std::net::Ipv4Addr>() {
            Ok(address) => v4::increment_one(address).to_string(),
            Err(_) => format!("{answer}1"),
        },
        Matcher::Cidr => match SubnetV4::parse(answer) {
            Some(subnet) => SubnetV4 {
                address: v4::increment_by(subnet.address, 1 << (32 - subnet.mask)),
                mask: subnet.mask,
            }
            .to_string(),
            None => format!("{answer}1"),
        },
        Matcher::Ipv6Expanded | Matcher::Ipv6Abbreviated => match v6::parse(answer) {
            Some(address) => {
                let next = v6::increment_one(address);
                if matcher == Matcher::Ipv6Expanded {
                    v6::expand(next)
                } else {
                    v6::abbreviate(next)
                }
            }
            None => format!("{answer}1"),
        },
        Matcher::Exact => format!("{answer} "),
    }
}

#[test]
fn network_and_broadcast_answers_are_actually_correct() {
    let mut rng = Rng::new(1);
    let network = REGISTRY
        .iter()
        .find(|r| r.kind == QuestionKind::NetworkAddress)
        .unwrap();
    let broadcast = REGISTRY
        .iter()
        .find(|r| r.kind == QuestionKind::Broadcast)
        .unwrap();

    for _ in 0..SAMPLES {
        let question = (network.generate)(&mut rng);
        let subnet = SubnetV4::parse(&question.subject).expect("a CIDR subject");
        assert_eq!(question.answer, subnet.network_address().to_string());

        let question = (broadcast.generate)(&mut rng);
        let subnet = SubnetV4::parse(&question.subject).expect("a CIDR subject");
        assert_eq!(question.answer, subnet.broadcast().to_string());
    }
}

#[test]
fn host_count_answers_match_the_prefix_length() {
    let registration = REGISTRY
        .iter()
        .find(|r| r.kind == QuestionKind::NumberOfHosts)
        .unwrap();
    let mut rng = Rng::new(2);
    for _ in 0..SAMPLES {
        let question = (registration.generate)(&mut rng);
        let subnet = SubnetV4::parse(&question.subject).expect("a CIDR subject");
        assert!((22..=28).contains(&subnet.mask), "unexpected mask {}", subnet.mask);
        assert_eq!(question.answer, subnet.num_of_host_addresses().to_string());
    }
}

#[test]
fn split_subnet_answers_land_on_the_right_block() {
    for (kind, block_index) in [
        (QuestionKind::SplitSubnetSecond, 1u64),
        (QuestionKind::SplitSubnetThird, 2),
    ] {
        let registration = REGISTRY.iter().find(|r| r.kind == kind).unwrap();
        let mut rng = Rng::new(3);
        for _ in 0..SAMPLES {
            let question = (registration.generate)(&mut rng);
            let original = SubnetV4::parse(&question.subject).expect("a CIDR subject");
            let splits: u32 = question.subject2.parse().expect("a split count");
            let answer = SubnetV4::parse(&question.answer).expect("a CIDR answer");

            assert!(answer.mask > original.mask, "the block must be smaller");
            assert!(
                original.number_of_subnets(answer.mask) >= splits as u64,
                "{splits} blocks do not fit in /{}",
                answer.mask
            );

            let blocks = original.split(answer.mask);
            assert_eq!(
                answer.network_address(),
                blocks[block_index as usize].network_address(),
                "wrong block for {original} split by {splits}"
            );
        }
    }
}

#[test]
fn netmask_conversion_questions_round_trip() {
    let to_dotted = REGISTRY
        .iter()
        .find(|r| r.kind == QuestionKind::CidrToDotted)
        .unwrap();
    let to_cidr = REGISTRY
        .iter()
        .find(|r| r.kind == QuestionKind::DottedToCidr)
        .unwrap();
    let mut rng = Rng::new(4);

    for _ in 0..SAMPLES {
        let question = (to_dotted.generate)(&mut rng);
        let mask: u8 = question.subject.parse().expect("a prefix length");
        assert_eq!(question.answer, v4::mask_to_dotted(mask).unwrap().to_string());

        let question = (to_cidr.generate)(&mut rng);
        let dotted: std::net::Ipv4Addr = question.subject.parse().expect("a dotted mask");
        assert_eq!(question.answer, v4::dotted_to_mask(dotted).unwrap().to_string());
    }
}

#[test]
fn ipv6_abbreviation_questions_are_worth_asking() {
    let registration = REGISTRY
        .iter()
        .find(|r| r.kind == QuestionKind::AbbreviateIpv6)
        .unwrap();
    let mut rng = Rng::new(5);
    let mut compressible = 0;

    for _ in 0..SAMPLES {
        let question = (registration.generate)(&mut rng);
        assert_eq!(question.response_template, question.subject);
        assert_eq!(question.subject.len(), 39, "the prompt must be fully expanded");

        let address = v6::parse(&question.subject).expect("a valid address");
        assert_eq!(question.answer, address.to_string());
        if question.answer.contains("::") {
            compressible += 1;
        }
    }
    assert_eq!(
        compressible, SAMPLES,
        "every generated address must be abbreviable"
    );
}

#[test]
fn ipv6_expansion_questions_round_trip() {
    let registration = REGISTRY
        .iter()
        .find(|r| r.kind == QuestionKind::ExpandIpv6)
        .unwrap();
    let mut rng = Rng::new(6);
    for _ in 0..SAMPLES {
        let question = (registration.generate)(&mut rng);
        let address = v6::parse(&question.subject).expect("a valid address");
        assert_eq!(question.answer, v6::expand(address));
        assert_eq!(question.answer.len(), 39);
        assert_eq!(v6::parse(&question.answer), Some(address));
    }
}

#[test]
fn eui64_options_all_sit_inside_the_prefix() {
    let registration = REGISTRY.iter().find(|r| r.kind == QuestionKind::Eui64).unwrap();
    let mut rng = Rng::new(8);
    for _ in 0..SAMPLES {
        let question = (registration.generate)(&mut rng);
        let mac = MacAddress::parse(&question.subject).expect("a MAC address");
        let subnet = SubnetV6::parse(&question.subject2).expect("a prefix");

        assert_eq!(question.answer, subnet.eui64(mac).to_string());
        for option in &question.options {
            let address = v6::parse(option).expect("a valid option");
            assert!(subnet.matches(address), "{option} escapes {subnet}");
            let octets = address.octets();
            assert_eq!(octets[11], 0xFF, "EUI-64 marker missing");
            assert_eq!(octets[12], 0xFE, "EUI-64 marker missing");
        }
    }
}

#[test]
fn ipv6_subnet_count_options_are_powers_of_two() {
    let registration = REGISTRY
        .iter()
        .find(|r| r.kind == QuestionKind::NumberOfIpv6Subnets)
        .unwrap();
    let mut rng = Rng::new(9);
    for _ in 0..SAMPLES {
        let question = (registration.generate)(&mut rng);
        let subnet = SubnetV6::parse(&question.subject).expect("a prefix");
        assert!((48..64).contains(&subnet.mask), "unexpected mask {}", subnet.mask);
        assert_eq!(question.answer, subnet.number_of_subnets(64).to_string());

        for option in &question.options {
            let value: u128 = option.parse().expect("a number");
            assert!(value.is_power_of_two(), "{option} is not a power of two");
        }
    }
}

#[test]
fn ipv6_prefix_questions_stay_within_the_reference_table() {
    let registration = REGISTRY
        .iter()
        .find(|r| r.kind == QuestionKind::Ipv6Prefix)
        .unwrap();
    let mut rng = Rng::new(10);
    let mut both_directions = [false, false];

    for _ in 0..SAMPLES {
        let question = (registration.generate)(&mut rng);
        let inverted = question.subject2 == "purposeToPrefix";
        both_directions[usize::from(inverted)] = true;

        let pair = IPV6_PREFIXES
            .iter()
            .find(|(prefix, purpose)| {
                if inverted {
                    *purpose == question.subject && *prefix == question.answer
                } else {
                    *prefix == question.subject && *purpose == question.answer
                }
            })
            .expect("subject and answer must come from the same row");

        for option in &question.options {
            assert!(
                IPV6_PREFIXES
                    .iter()
                    .any(|(prefix, purpose)| option == if inverted { prefix } else { purpose }),
                "{option} is not in the reference table"
            );
        }
        assert!(!pair.0.is_empty());
    }
    assert!(both_directions[0] && both_directions[1], "both directions must occur");
}

#[test]
fn categories_are_tagged_correctly() {
    for registration in REGISTRY {
        let expected = match registration.kind {
            QuestionKind::AbbreviateIpv6
            | QuestionKind::ExpandIpv6
            | QuestionKind::Ipv6Prefix
            | QuestionKind::Eui64
            | QuestionKind::NumberOfIpv6Subnets => Category::IPv6,
            _ => Category::IPv4,
        };
        assert_eq!(registration.category, expected, "{:?}", registration.kind);
    }
    assert_eq!(REGISTRY.iter().filter(|r| r.category == Category::IPv4).count(), 7);
    assert_eq!(REGISTRY.iter().filter(|r| r.category == Category::IPv6).count(), 5);
}
