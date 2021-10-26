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

        public IPv4Address(string ipStr)
        {
            if(!System.Net.IPAddress.TryParse(ipStr, out var ipAddress))
            {
                throw new ArgumentException("Could not parse IP address");
            }
            if(ipAddress.AddressFamily != System.Net.Sockets.AddressFamily.InterNetwork)
            {
                throw new ArgumentException("Not a IPv4 address");
            }
            if(System.Net.IPAddress.IsLoopback(ipAddress))
                throw new ArgumentException("Cannot route link local");

            this.ipAddress = ipAddress;
        }


    }
}
