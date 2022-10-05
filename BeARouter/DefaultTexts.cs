using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter
{
    public static class DefaultTexts
    {

        public const string PRESS_START_TO_RECEIVE_FIRST_IPV4 = "Press start to receive first IPv4 packet.";

        public const string IPv4PACKET_DESCRIPTION = "{0} is sending an IPv4 packet to {1}.\nSelect the interfaces to which the router should forward the IPv4 packet.";

        public const string IPv4PACKET_RESULT = "{0}! Route {1} would have been selected. See explanation (click here) for more details.";

        public const string CORRECT = "correct";

        public const string WRONG = "Wrong";

        public const string EXPLAIN_DEST_IP = "The IPv4 packet has the destination {0}";

        public const string ROUTE_EXPLAIN_LINE = "route {0,-19} has Suffix (CIDR) {1,-2} -> applied to dest. address -> results into net address {2,-19} => {3}";

        public const string NO_MATCH = "NO MATCH";

        public const string MATCH = "MATCH";

        public const string ROUTE_NUM_MATCHES = "{0} matches were found.";

        public const string ROUTE_DECISION = "{0} was chosen from the matching routes because it has the highest suffix ({1}).";

    }
}
