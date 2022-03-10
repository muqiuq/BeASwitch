using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.NetworkInformation;
using System.Text;

namespace BeARouter
{
    internal class UniqueID
    {
        private string Id;

        public UniqueID()
        {
            var macAddr =
            (
                from nic in NetworkInterface.GetAllNetworkInterfaces()
                where nic.OperationalStatus == OperationalStatus.Up
                select nic.GetPhysicalAddress()
            ).FirstOrDefault();

            var macAddrAny =
            (
                from nic in NetworkInterface.GetAllNetworkInterfaces()
                select nic.GetPhysicalAddress()
            ).FirstOrDefault();
            
            if(macAddr == null || macAddr.GetAddressBytes().Length == 0)
            {
                if(macAddrAny == null || macAddrAny.GetAddressBytes().Length == 0)
                {
                    Id = "N/A";
                    return;
                }
                Id = calcId(macAddrAny);
            }
            else
            {
                Id = calcId(macAddr);
            }
        }

        private string calcId(PhysicalAddress macAddr)
        {
            long a = (macAddr.GetAddressBytes()[0] * macAddr.GetAddressBytes()[4] + macAddr.GetAddressBytes()[3] * 10 + macAddr.GetAddressBytes()[1] * 100 + macAddr.GetAddressBytes()[2] * 1000 + macAddr.GetAddressBytes()[5] * 10000 + (1+macAddr.GetAddressBytes()[3]) * 100000) %1000000;
            long firstPart = a / 1000;
            long secondPart = a % 1000;
            return string.Format("{0}-{1}", firstPart, secondPart);
        }

        public override string ToString()
        {
            return Id;
        }

    }
}
