//! Question model shared by every quiz question type.

use net_core::v4::{self, SubnetV4};
use net_core::v6;
use std::net::Ipv4Addr;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Category {
    IPv4,
    IPv6,
}

impl Category {
    pub fn as_str(&self) -> &'static str {
        match self {
            Category::IPv4 => "ipv4",
            Category::IPv6 => "ipv6",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InputType {
    Text,
    SingleChoice,
}

/// Every question type, used as a stable key for i18n and for avoiding repeats.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum QuestionKind {
    NetworkAddress,
    Broadcast,
    NumberOfHosts,
    SplitSubnetSecond,
    SplitSubnetThird,
    CidrToDotted,
    DottedToCidr,
    AbbreviateIpv6,
    ExpandIpv6,
    Ipv6Prefix,
    Eui64,
    NumberOfIpv6Subnets,
}

impl QuestionKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            QuestionKind::NetworkAddress => "networkAddress",
            QuestionKind::Broadcast => "broadcast",
            QuestionKind::NumberOfHosts => "numberOfHosts",
            QuestionKind::SplitSubnetSecond => "splitSubnetSecond",
            QuestionKind::SplitSubnetThird => "splitSubnetThird",
            QuestionKind::CidrToDotted => "cidrToDotted",
            QuestionKind::DottedToCidr => "dottedToCidr",
            QuestionKind::AbbreviateIpv6 => "abbreviateIpv6",
            QuestionKind::ExpandIpv6 => "expandIpv6",
            QuestionKind::Ipv6Prefix => "ipv6Prefix",
            QuestionKind::Eui64 => "eui64",
            QuestionKind::NumberOfIpv6Subnets => "numberOfIpv6Subnets",
        }
    }
}

/// How a typed answer is compared against the expected one.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Matcher {
    Exact,
    Ipv4,
    Integer,
    Cidr,
    /// Any spelling with the same value, as long as it is fully expanded.
    Ipv6Expanded,
    /// The canonical RFC 5952 form, or the alternative accepted by the original.
    Ipv6Abbreviated,
}

/// A generated question. Everything the UI needs, with the answer kept in wasm.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Question {
    pub kind: QuestionKind,
    pub category: Category,
    pub input_type: InputType,
    pub matcher: Matcher,
    /// Interpolated into the localised prompt template by the UI.
    pub subject: String,
    /// A second placeholder, used by the questions that need two values.
    pub subject2: String,
    pub answer: String,
    pub accepted: Vec<String>,
    pub response_hint: String,
    pub response_template: String,
    pub options: Vec<String>,
}

impl Question {
    pub fn evaluate(&self, response: &str) -> bool {
        let response = response.trim();
        if response.is_empty() {
            return false;
        }
        if self
            .accepted
            .iter()
            .any(|a| a.eq_ignore_ascii_case(response))
        {
            return true;
        }
        match self.matcher {
            Matcher::Exact => self.answer == response,
            Matcher::Ipv4 => match (response.parse::<Ipv4Addr>(), self.answer.parse::<Ipv4Addr>()) {
                (Ok(a), Ok(b)) => a == b,
                _ => false,
            },
            Matcher::Integer => match (parse_integer(response), parse_integer(&self.answer)) {
                (Some(a), Some(b)) => a == b,
                _ => false,
            },
            Matcher::Cidr => match (SubnetV4::parse(response), SubnetV4::parse(&self.answer)) {
                (Some(a), Some(b)) => {
                    a.mask == b.mask && a.network_address() == b.network_address()
                }
                _ => false,
            },
            Matcher::Ipv6Expanded => self.answer.eq_ignore_ascii_case(response),
            Matcher::Ipv6Abbreviated => match v6::parse(response) {
                // Reject a merely equivalent but uncompressed spelling.
                Some(address) => {
                    address.to_string().eq_ignore_ascii_case(response)
                        && address.to_string() == self.answer
                }
                None => false,
            },
        }
    }
}

/// Tolerates thousands separators and spaces, e.g. `65'534`, `65,534`, `65 534`.
fn parse_integer(text: &str) -> Option<i128> {
    let cleaned: String = text
        .chars()
        .filter(|c| !matches!(c, '\'' | ',' | '.' | ' ' | '_'))
        .collect();
    cleaned.parse().ok()
}

pub(crate) fn dotted_mask(mask: u8) -> String {
    v4::mask_to_dotted(mask)
        .unwrap_or(Ipv4Addr::UNSPECIFIED)
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::{parse_integer, Category, InputType, Matcher, Question, QuestionKind};

    fn question(matcher: Matcher, answer: &str) -> Question {
        Question {
            kind: QuestionKind::NetworkAddress,
            category: Category::IPv4,
            input_type: InputType::Text,
            matcher,
            subject: String::new(),
            subject2: String::new(),
            answer: answer.to_owned(),
            accepted: Vec::new(),
            response_hint: String::new(),
            response_template: String::new(),
            options: Vec::new(),
        }
    }

    #[test]
    fn blank_answers_are_never_correct() {
        for matcher in [Matcher::Exact, Matcher::Ipv4, Matcher::Integer] {
            assert!(!question(matcher, "10.0.0.0").evaluate("   "));
        }
    }

    #[test]
    fn ipv4_answers_ignore_surrounding_space() {
        let q = question(Matcher::Ipv4, "192.168.1.0");
        assert!(q.evaluate(" 192.168.1.0 "));
        assert!(!q.evaluate("192.168.1.1"));
        assert!(!q.evaluate("not an address"));
    }

    #[test]
    fn integers_tolerate_thousands_separators() {
        let q = question(Matcher::Integer, "65534");
        assert!(q.evaluate("65534"));
        assert!(q.evaluate("65'534"));
        assert!(q.evaluate("65,534"));
        assert!(q.evaluate("65 534"));
        assert!(!q.evaluate("65535"));
    }

    #[test]
    fn cidr_answers_compare_by_network() {
        let q = question(Matcher::Cidr, "192.168.1.64/26");
        assert!(q.evaluate("192.168.1.64/26"));
        assert!(q.evaluate("192.168.1.70/26"), "same network, different host");
        assert!(!q.evaluate("192.168.1.64/27"));
        assert!(!q.evaluate("192.168.1.0/26"));
    }

    #[test]
    fn expanded_ipv6_must_be_fully_written_out() {
        let q = question(Matcher::Ipv6Expanded, "2001:0db8:0000:0000:0000:0000:0000:0001");
        assert!(q.evaluate("2001:0db8:0000:0000:0000:0000:0000:0001"));
        assert!(q.evaluate("2001:0DB8:0000:0000:0000:0000:0000:0001"));
        assert!(!q.evaluate("2001:db8::1"));
    }

    #[test]
    fn abbreviated_ipv6_must_actually_be_abbreviated() {
        let q = question(Matcher::Ipv6Abbreviated, "2001:db8::1");
        assert!(q.evaluate("2001:db8::1"));
        assert!(q.evaluate("2001:DB8::1"));
        assert!(
            !q.evaluate("2001:0db8:0000:0000:0000:0000:0000:0001"),
            "the expanded form is not an abbreviation"
        );
        assert!(!q.evaluate("2001:db8::2"));
    }

    #[test]
    fn explicitly_accepted_alternatives_win() {
        let mut q = question(Matcher::Ipv6Abbreviated, "2bcd:0:0:fa00::");
        q.accepted.push("2bcd::0:fa00::".to_owned());
        assert!(q.evaluate("2bcd::0:fa00::"));
    }

    #[test]
    fn integer_parser_rejects_nonsense() {
        assert_eq!(parse_integer("12"), Some(12));
        assert_eq!(parse_integer("1'000'000"), Some(1_000_000));
        assert_eq!(parse_integer("twelve"), None);
        assert_eq!(parse_integer(""), None);
    }
}
