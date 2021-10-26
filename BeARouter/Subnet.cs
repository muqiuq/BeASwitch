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

        public static byte[] MaskToBytes(int mask)
        {
            if (mask < 0 && mask > 32) throw new ArgumentException("Invalid mask!");
            byte[] maskBytes = new byte[4];
            int maskRest = mask;
            int count = 0;
            while(maskRest > 0)
            {
                maskBytes[count/8] += (byte)(0x80 >> ((byte)count % 8));
                maskRest--;
                count++;
            }
            return maskBytes;
        }

        public SubnetMatchResult Match(IPv4Address otherIpv4Address)
        {
            byte[] srcIp = otherIpv4Address.GetBytes();
            byte[] netmask = IpAddress.GetBytes();
            byte[] maskBytes = MaskToBytes(Mask);
            byte[] result = new byte[4];
            for(int a = 0; a < srcIp.Length; a++)
            {
                result[a] = (byte)(srcIp[a] & maskBytes[a]);
            }
            return new SubnetMatchResult(Helper.Equals(netmask, result), this, otherIpv4Address);
        }
    }
}
