using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter
{
    public class SubnetMatchResult<S, T> where S : ISubnet
    {

        public readonly bool IsMatch;

        public int Mask
        {
            get
            {
                return Subnet.Mask;
            }
        }

        public readonly S Subnet;

        public readonly T IpAddress;

        public SubnetMatchResult(bool isMatch, S subnet, T ipAddress)
        {
            IsMatch = isMatch;
            Subnet = subnet;
            IpAddress = ipAddress;
        }
    }
}
