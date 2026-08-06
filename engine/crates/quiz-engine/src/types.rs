//! The twelve question generators.
//!
//! Ported from `BeARouter/DoAQuiz/QuestionTypes/`. The original discovered
//! these by scanning assemblies with reflection, which is impossible in wasm,
//! so [`REGISTRY`] lists them explicitly instead.

use crate::question::{dotted_mask, Category, InputType, Matcher, Question, QuestionKind};
use net_core::v4::{self, SubnetV4};
use net_core::v6::{self, SubnetV6};
use net_core::{MacAddress, Rng};
use std::net::Ipv4Addr;

/// Relative weight of a question type, replacing `[Frequency(n)]`.
pub struct Registration {
    pub kind: QuestionKind,
    pub category: Category,
    pub frequency: u32,
    pub generate: fn(&mut Rng) -> Question,
}

pub static REGISTRY: &[Registration] = &[
    Registration {
        kind: QuestionKind::NetworkAddress,
        category: Category::IPv4,
        frequency: 1,
        generate: network_address,
    },
    Registration {
        kind: QuestionKind::Broadcast,
        category: Category::IPv4,
        frequency: 1,
        generate: broadcast,
    },
    Registration {
        kind: QuestionKind::NumberOfHosts,
        category: Category::IPv4,
        frequency: 1,
        generate: number_of_hosts,
    },
    Registration {
        kind: QuestionKind::SplitSubnetSecond,
        category: Category::IPv4,
        frequency: 2,
        generate: split_subnet_second,
    },
    Registration {
        kind: QuestionKind::SplitSubnetThird,
        category: Category::IPv4,
        frequency: 2,
        generate: split_subnet_third,
    },
    Registration {
        kind: QuestionKind::CidrToDotted,
        category: Category::IPv4,
        frequency: 1,
        generate: cidr_to_dotted,
    },
    Registration {
        kind: QuestionKind::DottedToCidr,
        category: Category::IPv4,
        frequency: 1,
        generate: dotted_to_cidr,
    },
    Registration {
        kind: QuestionKind::AbbreviateIpv6,
        category: Category::IPv6,
        frequency: 1,
        generate: abbreviate_ipv6,
    },
    Registration {
        kind: QuestionKind::ExpandIpv6,
        category: Category::IPv6,
        frequency: 1,
        generate: expand_ipv6,
    },
    Registration {
        kind: QuestionKind::Ipv6Prefix,
        category: Category::IPv6,
        frequency: 1,
        generate: ipv6_prefix,
    },
    Registration {
        kind: QuestionKind::Eui64,
        category: Category::IPv6,
        frequency: 1,
        generate: eui64,
    },
    Registration {
        kind: QuestionKind::NumberOfIpv6Subnets,
        category: Category::IPv6,
        frequency: 1,
        generate: number_of_ipv6_subnets,
    },
];

/// Well-known IPv6 prefixes and their purpose, used in both directions.
pub const IPV6_PREFIXES: &[(&str, &str)] = &[
    ("fc00::/7", "uniqueLocalUnicast"),
    ("ff00::/8", "multicast"),
    ("fe80::/10", "linkScopedUnicast"),
    ("2001:db8::/32", "documentation"),
    ("2000::/3", "globalUnicast"),
    ("::1/128", "loopback"),
    ("2002::/16", "sixToFour"),
    ("64:ff9b::/96", "ipv4Ipv6Translation"),
];

fn text_question(
    kind: QuestionKind,
    category: Category,
    matcher: Matcher,
    subject: String,
    answer: String,
    hint: &str,
) -> Question {
    Question {
        kind,
        category,
        input_type: InputType::Text,
        matcher,
        subject,
        subject2: String::new(),
        answer,
        accepted: Vec::new(),
        response_hint: hint.to_owned(),
        response_template: String::new(),
        options: Vec::new(),
    }
}

fn network_address(rng: &mut Rng) -> Question {
    let subnet = v4::random_ipv4_subnet(rng, 8, 28);
    text_question(
        QuestionKind::NetworkAddress,
        Category::IPv4,
        Matcher::Ipv4,
        subnet.to_string(),
        subnet.network_address().to_string(),
        "X.X.X.X",
    )
}

fn broadcast(rng: &mut Rng) -> Question {
    let subnet = v4::random_ipv4_subnet(rng, 8, 28);
    text_question(
        QuestionKind::Broadcast,
        Category::IPv4,
        Matcher::Ipv4,
        subnet.to_string(),
        subnet.broadcast().to_string(),
        "X.X.X.X",
    )
}

fn number_of_hosts(rng: &mut Rng) -> Question {
    let subnet = v4::random_ipv4_subnet(rng, 22, 28);
    text_question(
        QuestionKind::NumberOfHosts,
        Category::IPv4,
        Matcher::Integer,
        subnet.to_string(),
        subnet.num_of_host_addresses().to_string(),
        "X",
    )
}

/// How many bits must be borrowed to create at least `splits` subnets.
fn bits_for_splits(splits: u32) -> u8 {
    let mut bits = 0u8;
    while (1u32 << bits) < splits {
        bits += 1;
    }
    bits
}

fn split_subnet(rng: &mut Rng, kind: QuestionKind, min_splits: i64, block_index: u32) -> Question {
    let subnet = v4::random_ipv4_subnet(rng, 8, 26).to_network();
    let splits = rng.range(min_splits, 9) as u32;
    let new_mask = (subnet.mask + bits_for_splits(splits)).min(v4::V4_BITS);

    let block_size = 1u64 << (v4::V4_BITS - new_mask);
    let address = Ipv4Addr::from(
        (u32::from(subnet.network_address()) as u64 + block_size * block_index as u64) as u32,
    );
    let answer = SubnetV4 {
        address,
        mask: new_mask,
    };

    let mut question = text_question(
        kind,
        Category::IPv4,
        Matcher::Cidr,
        subnet.to_string(),
        answer.to_string(),
        "X.X.X.X/X",
    );
    question.subject2 = splits.to_string();
    question
}

fn split_subnet_second(rng: &mut Rng) -> Question {
    split_subnet(rng, QuestionKind::SplitSubnetSecond, 2, 1)
}

fn split_subnet_third(rng: &mut Rng) -> Question {
    split_subnet(rng, QuestionKind::SplitSubnetThird, 3, 2)
}

fn cidr_to_dotted(rng: &mut Rng) -> Question {
    let mask = rng.range(0, 33) as u8;
    text_question(
        QuestionKind::CidrToDotted,
        Category::IPv4,
        Matcher::Ipv4,
        mask.to_string(),
        dotted_mask(mask),
        "X.X.X.X",
    )
}

fn dotted_to_cidr(rng: &mut Rng) -> Question {
    let mask = rng.range(0, 33) as u8;
    text_question(
        QuestionKind::DottedToCidr,
        Category::IPv4,
        Matcher::Integer,
        dotted_mask(mask),
        mask.to_string(),
        "X",
    )
}

fn abbreviate_ipv6(rng: &mut Rng) -> Question {
    let address = v6::random_ipv6_subnet(rng, 32, 64, 4).address;
    let expanded = v6::expand(address);
    let mut question = text_question(
        QuestionKind::AbbreviateIpv6,
        Category::IPv6,
        Matcher::Ipv6Abbreviated,
        expanded.clone(),
        v6::abbreviate(address),
        "",
    );
    question.response_template = expanded;
    question.accepted.push(v6::alternative_abbreviation(address));
    question
}

fn expand_ipv6(rng: &mut Rng) -> Question {
    let address = v6::random_ipv6_subnet(rng, 32, 64, 4).address;
    let abbreviated = v6::abbreviate(address);
    let mut question = text_question(
        QuestionKind::ExpandIpv6,
        Category::IPv6,
        Matcher::Ipv6Expanded,
        abbreviated.clone(),
        v6::expand(address),
        "",
    );
    question.response_template = abbreviated;
    question
}

/// Single choice, asked in either direction: prefix -> purpose or purpose -> prefix.
fn ipv6_prefix(rng: &mut Rng) -> Question {
    let index = rng.below(IPV6_PREFIXES.len() as u64) as usize;
    let (prefix, purpose) = IPV6_PREFIXES[index];
    let inverted = rng.bool();

    let (subject, answer) = if inverted {
        (purpose, prefix)
    } else {
        (prefix, purpose)
    };

    let mut distractors: Vec<String> = IPV6_PREFIXES
        .iter()
        .enumerate()
        .filter(|(i, _)| *i != index)
        .map(|(_, (p, u))| if inverted { (*p).to_owned() } else { (*u).to_owned() })
        .collect();
    rng.shuffle(&mut distractors);
    distractors.truncate(3);

    let mut options = vec![answer.to_owned()];
    options.extend(distractors);
    rng.shuffle(&mut options);

    Question {
        kind: QuestionKind::Ipv6Prefix,
        category: Category::IPv6,
        input_type: InputType::SingleChoice,
        matcher: Matcher::Exact,
        subject: subject.to_owned(),
        // Lets the UI pick the right prompt wording and translate the purposes.
        subject2: if inverted { "purposeToPrefix" } else { "prefixToPurpose" }.to_owned(),
        answer: answer.to_owned(),
        accepted: Vec::new(),
        response_hint: String::new(),
        response_template: String::new(),
        options,
    }
}

fn eui64(rng: &mut Rng) -> Question {
    let mac = MacAddress::random(rng);
    let subnet = v6::random_ipv6_subnet(rng, 64, 64, 1).to_network();
    let answer = subnet.eui64(mac).to_string();

    let mut options = vec![answer.clone()];
    let mut guard = 0;
    while options.len() < 4 && guard < 64 {
        guard += 1;
        // Distractors come from neighbouring MACs, so the EUI-64 shape is
        // identical and only the embedded address differs.
        let candidate = subnet.eui64(MacAddress::random(rng)).to_string();
        if !options.contains(&candidate) {
            options.push(candidate);
        }
    }
    rng.shuffle(&mut options);

    Question {
        kind: QuestionKind::Eui64,
        category: Category::IPv6,
        input_type: InputType::SingleChoice,
        matcher: Matcher::Exact,
        subject: mac.to_string(),
        subject2: subnet.to_string(),
        answer,
        accepted: Vec::new(),
        response_hint: String::new(),
        response_template: String::new(),
        options,
    }
}

fn number_of_ipv6_subnets(rng: &mut Rng) -> Question {
    let subnet = SubnetV6 {
        address: v6::random_ipv6_subnet(rng, 48, 64, 1).address,
        mask: rng.range(48, 64) as u8,
    }
    .to_network();
    let answer = subnet.number_of_subnets(64).to_string();

    let mut options = vec![answer.clone()];
    let mut guard = 0;
    while options.len() < 4 && guard < 64 {
        guard += 1;
        let mask = rng.range(48, 64) as u8;
        let candidate = (1u128 << (64 - mask)).to_string();
        if !options.contains(&candidate) {
            options.push(candidate);
        }
    }
    rng.shuffle(&mut options);

    Question {
        kind: QuestionKind::NumberOfIpv6Subnets,
        category: Category::IPv6,
        input_type: InputType::SingleChoice,
        matcher: Matcher::Exact,
        subject: subnet.to_string(),
        subject2: "64".to_owned(),
        answer,
        accepted: Vec::new(),
        response_hint: String::new(),
        response_template: String::new(),
        options,
    }
}
