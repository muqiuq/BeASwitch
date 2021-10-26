using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter
{
    public class SubnetMatchResult
    {

        public readonly bool IsMatch;

        public int Mask
        {
            get
            {
                return Subnet.Mask;
            }
        }

        public readonly Subnet Subnet;

        public readonly IPv4Address IpAddress;

        public SubnetMatchResult(bool isMatch, Subnet subnet, IPv4Address ipAddress)
        {
            IsMatch = isMatch;
            Subnet = subnet;
            IpAddress = ipAddress;
        }
    }
}
