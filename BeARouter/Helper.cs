using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

namespace BeARouter
{
    public class Helper
    {

        public static bool Equals(byte[] a1, byte[] b1)
        {
            int i;
            if (a1.Length == b1.Length)
            {
                i = 0;
                while (i < a1.Length && (a1[i] == b1[i])) //Earlier it was a1[i]!=b1[i]
                {
                    i++;
                }
                if (i == a1.Length)
                {
                    return true;
                }
            }

            return false;
        }

        public static long ByteArrayToLong(byte[] by)
        {
            long value = 0;
            for (int i = 0; i < by.Length; i++)
            {
                value = (value << 8) + (by[i] & 0xff);
            }

            return value;
        }

        public static string GenerateRandomMAC()
        {
            byte[] mac = new byte[6];
            Random r = new Random();
            r.NextBytes(mac);
            //mac[0] = (byte)0x02;
            return string.Join(":", Array.ConvertAll(mac, b => b.ToString("X2")));
        }

        public static Subnet GetRandomIPv4Subnet(int minCidr = 8, int maxCidr = 28)
        {
            Random rand = new Random();

            
            int randomType = rand.Next(0, 3);
            if(randomType == 0)
            {
                return new Subnet(
                    new IPv4Address($"192.168.{rand.Next(0, 255)}.{rand.Next(2, 254)}"),
                    rand.Next(Math.Max(16, minCidr),Math.Min(28, maxCidr)));
            }
            if (randomType == 1)
            {
                return new Subnet(
                    new IPv4Address($"10.{rand.Next(0, 255)}.{rand.Next(0, 255)}.{rand.Next(2, 254)}"),
                    rand.Next(Math.Max(8, minCidr), Math.Min(28, maxCidr)));
            }
            return GetRandomPublicIPv4Subnet(minCidr, maxCidr);
        }

        public static Subnet GetRandomPublicIPv4Subnet(int minCidr = 16, int maxCidr = 28)
        {
            var rand = new Random();
            var firstPart = rand.Next(0, 197);
            if (firstPart == 10 || firstPart == 100 || firstPart == 127 ||
                firstPart == 192 || firstPart == 172 || firstPart == 169)
            {
                firstPart += 1;
            }

            return new Subnet(
                new IPv4Address($"{firstPart}.{rand.Next(0, 254)}.{rand.Next(0, 254)}.{rand.Next(0, 254)}"),
                rand.Next(Math.Max(16, minCidr), Math.Min(28, maxCidr)));

        }

        public static SubnetV6 GetRandomIPv6Subnet(int minCidr = 32, int maxCidr = 64, int numberOfZeroBytes = 0) 
        {
            var rand = new Random();

            var ipv6Address = new IPv6Address("2001:DB8:1::");
            var ipv6AddressBytes = ipv6Address.GetNativeIPAddress().GetAddressBytes();

            var numberOfRandomBytesRequired = 16 - (minCidr / 8);
            if (minCidr % 8 != 0) numberOfRandomBytesRequired += 1;

            var minByteToSet = minCidr / 8;
            if (minCidr % 8 != 0) minByteToSet += 1;

            var randomBytes = new byte[numberOfRandomBytesRequired];

            rand.NextBytes(randomBytes);
            for(int a = minByteToSet; a < 16; a++)
            {
                ipv6AddressBytes[a] = randomBytes[a - minByteToSet];
            }

            for(int a = 0; a < numberOfZeroBytes; a++)
            {
                var randomByte = rand.Next(minByteToSet, 16);
                ipv6AddressBytes[randomByte] = 0;
            }

            return new SubnetV6(new IPv6Address(new System.Net.IPAddress(ipv6AddressBytes)), rand.Next(minCidr, maxCidr));
        }


    }
}
