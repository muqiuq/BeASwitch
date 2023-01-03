using System;
using System.Collections.Generic;
using System.Net;
using System.Text;

namespace BeARouter
{
    public class SubnetV6 : ISubnet
    {
        public readonly IPv6Address IpAddress;

        public readonly int Mask;

        public SubnetV6(IPv6Address ipAddress, int mask)
        {
            IpAddress = ipAddress;
            Mask = mask;
        }

        public SubnetV6(string ipAddress, int mask)
        {
            IpAddress = new IPv6Address(ipAddress);
            Mask = mask;
        }

        public static byte[] MaskToBytes(int mask)
        {
            if (mask < 0 && mask > 128) throw new ArgumentException("Invalid mask!");
            byte[] maskBytes = new byte[16];
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
            for (int a = 0; a < 16; a++)
            {
                maskBytes[a] = (byte)~maskBytes[a];
            }
            return maskBytes;
        }

        private IPv6Address netAddress;

        public IPv6Address GetNetAddress()
        {
            if (netAddress == null)
            {
                byte[] addr = IpAddress.GetBytes();
                byte[] maskBytes = MaskToBytes(Mask);
                byte[] result = new byte[16];
                for (int a = 0; a < addr.Length; a++)
                {
                    result[a] = (byte)(addr[a] & maskBytes[a]);
                }
                netAddress = new IPv6Address(new System.Net.IPAddress(result));
            }
            return netAddress;
        }

        public SubnetV6 ToNetaddr()
        {
            return new SubnetV6(GetNetAddress(), Mask);
        }

        public long NumOfHostAddress
        {
            get
            {
                return (long)Math.Pow(2, (32 - Mask));
            }
        }

        int ISubnet.Mask => Mask;

        public IPAddress IPAddress => throw new NotImplementedException();

        public SubnetV6 GetNetSubnet()
        {
            return new SubnetV6 (GetNetAddress(), Mask);
        }

        internal Subnet ApplyOr(uint mask)
        {
            uint bigEndian = (uint)System.Net.IPAddress.HostToNetworkOrder((int)mask);
            byte[] b = BitConverter.GetBytes(bigEndian);
            byte[] ipAddrBytes = IpAddress.GetBytes();
            for (int a = 0; a < 16; a++)
            {
                ipAddrBytes[a] = (byte)(ipAddrBytes[a] | b[a]);
            }
            return new Subnet(new IPv4Address(new System.Net.IPAddress(ipAddrBytes)), Mask);
        }


        public bool IsNetmask()
        {
            return Helper.Equals(GetNetAddress().GetBytes(), IpAddress.GetBytes());
        }

        public SubnetMatchResult<SubnetV6, IPv6Address> Match(IPv6Address otherIpv4Address)
        {
            byte[] srcIp = otherIpv4Address.GetBytes();
            byte[] netaddr = GetNetAddress().GetBytes();
            byte[] maskBytes = MaskToBytes(Mask);
            byte[] result = new byte[16];
            for (int a = 0; a < srcIp.Length; a++)
            {
                result[a] = (byte)(srcIp[a] & maskBytes[a]);
            }
            return new SubnetMatchResult<SubnetV6, IPv6Address>(Helper.Equals(netaddr, result), this, otherIpv4Address);
        }

        internal SubnetV6 GetHostMin()
        {
            var newIpAddress = GetNetAddress();
            var hostMin = newIpAddress.IncrementOne();
            return new SubnetV6(hostMin, Mask);
        }

        internal IPv6Address GetAddress()
        {
            return IpAddress;
        }

        public override string ToString()
        {
            return $"{IpAddress}/{Mask}";
        }

        public override bool Equals(object obj)
        {
            if (obj.GetType() != typeof(SubnetV6)) return false;
            var other = (SubnetV6)obj;
            return other.GetAddress() == this.GetAddress() && other.Mask == this.Mask;
        }

        public IPv6Address GetEUI64(string mac)
        {
            byte[] macBytes = new byte[6];
            var macParts = mac.Split(':');
            for (int a = 0; a < 6; a++)
            {
                macBytes[a] = Convert.ToByte(macParts[a], 16);
            }
            var ipAddrBytes = IpAddress.GetBytes();
            
            var result = new byte[8];
            result[0] = (byte)(macBytes[0] ^ 0x02);
            result[1] = macBytes[1];
            result[2] = macBytes[2];
            result[3] = 0xFF;
            result[4] = 0xFE;
            result[5] = macBytes[3];
            result[6] = macBytes[4];
            result[7] = macBytes[5];
            for (int a = 0; a < 8; a++)
            {
                ipAddrBytes[a+8] = result[a];
            }

            return new IPv6Address(new System.Net.IPAddress(ipAddrBytes));
        }
        
    }
}