using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter
{
    public interface ISubnet
    {
        public int Mask { get; }

        public System.Net.IPAddress IPAddress { get; }
    }
}
