using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter
{
    public class Route : IComparable
    {
        private IPv4Address gateway;
        private IPv4Address src;

        private Subnet subnet;

        private RouterPort routerPort;
        
        private static readonly string notonlink = "{0,-19} via {1,-16} dev {2}";
        private static readonly string onlink = "{0,-19} dev {1} scope link src {2}";

        public Route(Subnet subnet, RouterPort routerPort, IPv4Address gateway = null, IPv4Address src = null)
        {
            this.gateway = gateway;
            this.subnet = subnet;
            this.routerPort = routerPort;
            this.src = src;
            if (src != null && gateway != null) throw new ArgumentException("Can't have source and gateway simultaneously");
        }

        public bool OnLink()
        {
            return gateway == null;
        }

        public override string ToString()
        {
            if(OnLink())
            {
                return string.Format(onlink, subnet, routerPort.Name, src);
            }
            else
            {
                return string.Format(notonlink, subnet, gateway, routerPort.Name);
            }
        }

        public int CompareTo(object obj)
        {
            if (obj.GetType() != typeof(Route)) return -1;
            var otherRoute = (Route)obj;
            return otherRoute.subnet.GetAddress().CompareTo(this.subnet.GetAddress());
        }
    }
}
