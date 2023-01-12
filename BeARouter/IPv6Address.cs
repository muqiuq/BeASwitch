using System;
using System.Collections.Generic;
using System.Net;
using System.Text;

namespace BeARouter
{
    public class IPv6Address : IComparable
    {
        private readonly System.Net.IPAddress ipAddress;

        public byte[] GetBytes()
        {
            return ipAddress.GetAddressBytes();
        }

        public override bool Equals(object obj)
        {
            return obj is IPv6Address address &&
                   EqualityComparer<System.Net.IPAddress>.Default.Equals(ipAddress, address.ipAddress);
        }

        public string GetAlternativeAbbreviation()
        {
            var ipAddressStr = ipAddress.ToString();
            return ipAddressStr.Replace(":0:", "::");
        }
        
        public static bool operator ==(IPv6Address left, IPv6Address right)
        {
            if (left is null && right is null) return true;
            if (left is null || right is null) return false;
            return left.Equals(right);
        }

        public static bool operator !=(IPv6Address left, IPv6Address right)
        {
            return !(left == right);
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
            if (ipAddress.AddressFamily != System.Net.Sockets.AddressFamily.InterNetworkV6)
            {
                throw new ArgumentException("Not a IPv6 address");
            }
            if (System.Net.IPAddress.IsLoopback(ipAddress))
                throw new ArgumentException("Cannot route link local");
        }

        public IPv6Address(string ipStr)
        {
            if (!System.Net.IPAddress.TryParse(ipStr, out var ipAddress))
            {
                throw new ArgumentException("Could not parse IP address");
            }
            checkIpAddress(ipAddress);

            this.ipAddress = ipAddress;
        }

        public IPv6Address(System.Net.IPAddress ipAddress)
        {
            checkIpAddress(ipAddress);

            this.ipAddress = ipAddress;
        }

        public IPv6Address IncrementOne()
        {
            var ipAddressBytes = ipAddress.GetAddressBytes();
            ipAddressBytes[15] += 1;
            var overflowed = ipAddressBytes[15] == 0;
            for (int x = 14; x >= 0; x--)
            {
                if (overflowed)
                {
                    ipAddressBytes[x] += 1;
                    overflowed = ipAddressBytes[x] == 0;
                }

            }
            return new IPv6Address(new System.Net.IPAddress(ipAddressBytes));
        }

        public IPv6Address IncrementBy(long skip)
        {

            var ipAddressBytes = ipAddress.GetAddressBytes();
            long rest = (long)ipAddressBytes[15] + skip;
            ipAddressBytes[15] = (byte)(rest % 256);
            rest = (rest / 256);
            for (int x = 14; x >= 0; x--)
            {
                rest = ipAddressBytes[x] + rest;
                ipAddressBytes[x] = (byte)(rest % 256);
                rest = (rest / 256);
            }
            return new IPv6Address(new System.Net.IPAddress(ipAddressBytes));
        }

        public int CompareTo(object obj)
        {
            if (obj.GetType() != typeof(IPv6Address)) return -1;
            var otherIpV6addr = (IPv6Address)obj;
            var otherVal = Helper.ByteArrayToLong(otherIpV6addr.GetBytes());
            var thisVal = Helper.ByteArrayToLong(this.GetBytes());
            if (otherVal > thisVal) return 1;
            if (otherVal == thisVal) return 0;
            return -1;
        }

        public System.Net.IPAddress GetNativeIPAddress() { return ipAddress; }

        public string Expand()
        {
            var ipAddrBytes = ipAddress.GetAddressBytes();
            System.Text.StringBuilder bldr = new System.Text.StringBuilder();
            for (int i = 0; i < 16; i += 2)
            {
                bldr.AppendFormat("{0:x2}{1:x2}:", ipAddrBytes[i], ipAddrBytes[i + 1]);
            }
            bldr.Length = bldr.Length - 1;//last colon
            return bldr.ToString();
        }

    }
}
