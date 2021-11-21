using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter
{
    public class IPv4Address : IComparable
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

        public IPv4Address IncrementOne()
        {
            var ipAddressBytes = ipAddress.GetAddressBytes();
            ipAddressBytes[3] += 1;
            var overflowed = ipAddressBytes[3] == 0;
            for(int x = 2; x >= 0; x--)
            {
                if(overflowed)
                {
                    ipAddressBytes[x] += 1;
                    overflowed = ipAddressBytes[x] == 0;
                }

            }
            return new IPv4Address(new System.Net.IPAddress(ipAddressBytes));
        }

        public int CompareTo(object obj)
        {
            if (obj.GetType() != typeof(IPv4Address)) return -1;
            var otherIpV4addr = (IPv4Address)obj;
            var otherVal = Helper.ByteArrayToLong(otherIpV4addr.GetBytes());
            var thisVal = Helper.ByteArrayToLong(this.GetBytes());
            if (otherVal > thisVal) return 1;
            if (otherVal == thisVal) return 0;
            return -1;
        }
    }
}
