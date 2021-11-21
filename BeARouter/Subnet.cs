using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace BeARouter
{
    public class Subnet
    {

        public readonly IPv4Address IpAddress;

        public readonly int Mask;

        public Subnet(IPv4Address ipAddress, int mask)
        {
            IpAddress = ipAddress;
            Mask = mask;
        }

        public Subnet(string ipAddress, int mask)
        {
            IpAddress = new IPv4Address(ipAddress);
            Mask = mask;
        }

        public static byte[] MaskToBytes(int mask)
        {
            if (mask < 0 && mask > 32) throw new ArgumentException("Invalid mask!");
            byte[] maskBytes = new byte[4];
            int maskRest = mask;
            int count = 0;
            while (maskRest > 0)
            {
                maskBytes[count / 8] += (byte)(0x80 >> ((byte)count % 8));
                maskRest--;
                count++;
            }
            return maskBytes;
        }

        public static byte[] InvertedMask(int mask)
        {
            byte[] maskBytes = new byte[4];
            for(int a = 0; a < 4; a++)
            {
                maskBytes[a] = (byte)~maskBytes[a];
            }
            return maskBytes;
        }

        public IPv4Address GetNetAddress()
        {
            byte[] addr = IpAddress.GetBytes();
            byte[] maskBytes = MaskToBytes(Mask);
            byte[] result = new byte[4];
            for (int a = 0; a < addr.Length; a++)
            {
                result[a] = (byte)(addr[a] & maskBytes[a]);
            }
            return new IPv4Address(new System.Net.IPAddress(result));
        }

        public Subnet ToNetaddr()
        {
            return new Subnet(GetNetAddress(), Mask);
        }

        public IPv4Address GetBroadcast()
        {
            byte[] broadcastAddr = GetNetAddress().GetBytes();
            byte[] invertedMask = InvertedMask(Mask);
            for(int a = 0; a < 4; a++) {
                broadcastAddr[a] = (byte)(broadcastAddr[a] | invertedMask[a]);
            }
            return new IPv4Address(new System.Net.IPAddress(broadcastAddr));
        }

        internal Subnet GetNetSubnet()
        {
            return new Subnet(GetNetAddress(), Mask);
        }

        public bool IsNetmask()
        {
            return Helper.Equals(GetNetAddress().GetBytes(), IpAddress.GetBytes());
        }

        public bool IsBroadcast()
        {
            return Helper.Equals(GetBroadcast().GetBytes(), IpAddress.GetBytes());
        }

        public bool IsHostAddress()
        {
            return !IsNetmask() && !IsBroadcast();
        }

        public SubnetMatchResult Match(IPv4Address otherIpv4Address)
        {
            byte[] srcIp = otherIpv4Address.GetBytes();
            byte[] netaddr = GetNetAddress().GetBytes();
            byte[] maskBytes = MaskToBytes(Mask);
            byte[] result = new byte[4];
            for(int a = 0; a < srcIp.Length; a++)
            {
                result[a] = (byte)(srcIp[a] & maskBytes[a]);
            }
            return new SubnetMatchResult(Helper.Equals(netaddr, result), this, otherIpv4Address);
        }

        internal Subnet GetHostMin()
        {
            var newIpAddress = GetNetAddress();
            var hostMin = newIpAddress.IncrementOne();
            return new Subnet(hostMin, Mask);
        }

        internal IPv4Address GetAddress()
        {
            return IpAddress;
        }

        public override string ToString()
        {
            return $"{IpAddress}/{Mask}";
        }
    }
}
