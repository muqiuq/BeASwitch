using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;

namespace BeARouter
{
    public class RoutingTable : IEnumerable<Route>, IList<Route>
    {

        private List<Route> routes = new List<Route>();

        public RoutingTable()
        {

        }

        public override string ToString()
        {
            var sb = new StringBuilder();
            foreach(var r in routes)
            {
                sb.AppendLine(r.ToString());
            }
            return sb.ToString();
        }

        public Route this[int index] { get => routes[index]; set => routes[index] = value; }

        public int Count => routes.Count;

        public bool IsReadOnly => false;

        public void Add(Route item)
        {
            routes.Add(item);
            routes.Sort();
        }

        public void Clear()
        {
            routes.Clear();
        }

        public bool Contains(Route item)
        {
            return routes.Contains(item);
        }

        public void CopyTo(Route[] array, int arrayIndex)
        {
            routes.CopyTo(array, arrayIndex);
        }

        public IEnumerator<Route> GetEnumerator()
        {
            return routes.GetEnumerator();
        }

        public int IndexOf(Route item)
        {
            return routes.IndexOf(item);
        }

        public void Insert(int index, Route item)
        {
            routes.Insert(index, item);
        }

        public bool Remove(Route item)
        {
            return routes.Remove(item);
        }

        public void RemoveAt(int index)
        {
            routes.RemoveAt(index);
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            return routes.GetEnumerator();
        }
    }
}
