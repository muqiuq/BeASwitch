using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Text;

namespace BeARouter
{
    public class RouterPorts : IEnumerable<RouterPort>
    {
        public Dictionary<int, RouterPort> Ports = new Dictionary<int, RouterPort>();

        public ICollection<int> Keys => Ports.Keys;

        public ICollection<RouterPort> Values => Ports.Values;

        public int Count => Ports.Count;

        public bool IsReadOnly => false;

        public RouterPort this[int key] { get => Ports[key]; set => Ports[key] = value; }

        public override string ToString()
        {
            return string.Join(System.Environment.NewLine, Ports.Select(p => p.Value.ToString()).ToList());
        }

        public RouterPorts()
        {

        }

        internal void Add(int a, RouterPort routerPort)
        {
            Ports.Add(a, routerPort);
        }

        public IEnumerator<RouterPort> GetEnumerator()
        {
            return Ports.Values.GetEnumerator();
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            return Ports.Values.GetEnumerator();
        }
    }
}
