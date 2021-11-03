using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter
{
    public class IPv4Address
    {

        private readonly System.Net.IPAddress ipAddress;

        public byte[] GetBytes()
        {
            return ipAddress.GetAddressBytes();
        }

        public override bool Equals(object obj)
        {
            return obj is IPv4Address address &&
                   EqualityComparer<System.Net.IPAddress>.Default.Equals(ipAddress, address.ipAddress);
        }

        public override int GetHashCode()
        {
            return HashCode.Combine(ipAddress);
        }

        public override string ToString()
        {
            return ipAddress.ToString();
        }

        private void checkIpAddress(System.Net.IPAddress ipAddress)
        {
            if (ipAddress.AddressFamily != System.Net.Sockets.AddressFamily.InterNetwork)
            {
                throw new ArgumentException("Not a IPv4 address");
            }
            if (System.Net.IPAddress.IsLoopback(ipAddress))
                throw new ArgumentException("Cannot route link local");
        }

        public IPv4Address(string ipStr)
        {
            if(!System.Net.IPAddress.TryParse(ipStr, out var ipAddress))
            {
                throw new ArgumentException("Could not parse IP address");
            }
            checkIpAddress(ipAddress);

            this.ipAddress = ipAddress;
        }

        public IPv4Address(System.Net.IPAddress ipAddress)
        {
            checkIpAddress(ipAddress);

            this.ipAddress = ipAddress;
        }

    }
}
