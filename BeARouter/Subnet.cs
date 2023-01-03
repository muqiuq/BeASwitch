using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;

namespace BeARouter
{
    public class Subnet : ISubnet
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
            byte[] maskBytes = MaskToBytes(mask);
            for (int a = 0; a < 4; a++)
            {
                maskBytes[a] = (byte)~maskBytes[a];
            }
            return maskBytes;
        }

        private IPv4Address netAddress;

        public IPv4Address GetNetAddress()
        {
            if(netAddress == null)
            {
                byte[] addr = IpAddress.GetBytes();
                byte[] maskBytes = MaskToBytes(Mask);
                byte[] result = new byte[4];
                for (int a = 0; a < addr.Length; a++)
                {
                    result[a] = (byte)(addr[a] & maskBytes[a]);
                }
                netAddress = new IPv4Address(new System.Net.IPAddress(result));
            }
            return netAddress;
        }

        public Subnet ToNetaddr()
        {
            return new Subnet(GetNetAddress(), Mask);
        }

        public Subnet GenerateNewWithLowestBitWithinMaskIncreased()
        {
            byte[] maskBytes = new byte[4];
            int maskRest = Mask;
            int count = 0;
            while (maskRest > 0)
            {
                if(maskRest == 1)
                {
                    maskBytes[count / 8] += (byte)(0x80 >> ((byte)count % 8));
                }
                maskRest--;
                count++;
            }
            byte[] addr = IpAddress.GetBytes();
            byte[] result = new byte[4];
            for (int a = 0; a < addr.Length; a++)
            {
                result[a] = (byte)(addr[a] | maskBytes[a]);
            }
            netAddress = new IPv4Address(new System.Net.IPAddress(result));
            return new Subnet(netAddress, Mask);
        }

        private IPv4Address broadcastAddr;

        public long NumOfHostAddress
        {
            get
            {
                return (long)Math.Pow(2, (32 - Mask)) - 2;
            }
        }

        int ISubnet.Mask => Mask;

        public IPAddress IPAddress => IpAddress.GetNativeIPAddress();

        public IPv4Address GetBroadcast()
        {
            if (broadcastAddr == null)
            {
                byte[] broadcastAddrBytes = GetNetAddress().GetBytes();
                byte[] invertedMask = InvertedMask(Mask);
                for (int a = 0; a < 4; a++)
                {
                    broadcastAddrBytes[a] = (byte)(broadcastAddrBytes[a] | invertedMask[a]);
                }
                broadcastAddr = new IPv4Address(new System.Net.IPAddress(broadcastAddrBytes));
            }
            return broadcastAddr;
        }

        internal Subnet GetNetSubnet()
        {
            return new Subnet(GetNetAddress(), Mask);
        }

        internal Subnet ApplyOr(uint mask)
        {
            uint bigEndian = (uint)System.Net.IPAddress.HostToNetworkOrder((int)mask);
            byte[] b = BitConverter.GetBytes(bigEndian);
            byte[] ipAddrBytes = IpAddress.GetBytes();
            for (int a = 0; a < 4; a++)
            {
                ipAddrBytes[a] = (byte)(ipAddrBytes[a] | b[a]);
            }
            return new Subnet(new IPv4Address(new System.Net.IPAddress(ipAddrBytes)), Mask);
        }

        internal Subnet GetBroadcastSubnet()
        {
            return new Subnet(GetBroadcast(), Mask);
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

        public SubnetMatchResult<Subnet, IPv4Address> Match(IPv4Address otherIpv4Address)
        {
            byte[] srcIp = otherIpv4Address.GetBytes();
            byte[] netaddr = GetNetAddress().GetBytes();
            byte[] maskBytes = MaskToBytes(Mask);
            byte[] result = new byte[4];
            for(int a = 0; a < srcIp.Length; a++)
            {
                result[a] = (byte)(srcIp[a] & maskBytes[a]);
            }
            return new SubnetMatchResult<Subnet, IPv4Address>(Helper.Equals(netaddr, result), this, otherIpv4Address);
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

        public override bool Equals(object obj)
        {
            if (obj.GetType() != typeof(Subnet)) return false;
            var other = (Subnet)obj;
            return other.GetAddress() == this.GetAddress() && other.Mask == this.Mask;
        }
    }
}
