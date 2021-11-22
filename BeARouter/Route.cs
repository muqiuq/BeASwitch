using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter
{
    public class Route : IComparable
    {
        private IPv4Address gateway;
        private IPv4Address src;

        public Subnet Subnet { get; private set; }

        public RouterPort RouterPort { get; private set; }

        private static readonly string notonlink = "{0,-19} via {1,-16}";
        private static readonly string onlink = "{0,-19} dev {1} scope link src {2}";

        public Route(Subnet subnet, RouterPort routerPort, IPv4Address gateway = null, IPv4Address src = null)
        {
            this.gateway = gateway;
            this.Subnet = subnet;
            this.RouterPort = routerPort;
            this.src = src;
            if (src != null && gateway != null) throw new ArgumentException("Can't have source and gateway simultaneously");
        }

        public bool OnLink()
        {
            return gateway == null;
        }

        public bool IsDefaultRoute()
        {
            return Subnet.Equals(new Subnet("0.0.0.0", 0));
        }

        public override string ToString()
        {
            if(OnLink())
            {
                return string.Format(onlink, Subnet, RouterPort.Name, src);
            }
            else
            {
                return string.Format(notonlink, Subnet, gateway);
            }
        }

        public int CompareTo(object obj)
        {
            if (obj.GetType() != typeof(Route)) return -1;
            var otherRoute = (Route)obj;
            return otherRoute.Subnet.GetAddress().CompareTo(this.Subnet.GetAddress());
        }
    }
}
