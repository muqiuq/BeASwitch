using NUnit.Framework;
using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.Test
{
    internal class SupnetIpV6Test
    {
        [SetUp]
        public void Setup()
        {
        }

        [Test]
        public void IPv6AddressTest1()
        {
            // 2001:DB8::/ 32
            IPv6Address addr = new IPv6Address("2001:DB8::");

            var newAddr = addr.IncrementOne();

            Assert.AreEqual("2001:db8::1", newAddr.ToString());
        }

        [Test]
        public void IPv6AddressTest2()
        {
            IPv6Address addr = new IPv6Address("2001:DB8::FF");

            var newAddr = addr.IncrementOne();

            Assert.AreEqual("2001:db8::100", newAddr.ToString());
        }

        [Test]
        public void IPv6AddressTest3()
        {
            IPv6Address addr = new IPv6Address("2001:DB8::FFFF");

            var newAddr = addr.IncrementOne();

            Assert.AreEqual("2001:db8::1:0", newAddr.ToString());
        }

        [Test]
        public void IPv6AddressTest4()
        {
            IPv6Address addr = new IPv6Address("2001:DB8::");

            var newAddr = addr.IncrementBy(300);

            Assert.AreEqual("2001:db8::12c", newAddr.ToString());
        }

        [Test]
        public void IPv6AddressTest5()
        {
            IPv6Address addr = new IPv6Address("2001:DB8::");

            var newAddr = addr.IncrementBy(65536);

            Assert.AreEqual("2001:db8::1:0", newAddr.ToString());
        }

        [Test]
        public void IPv6AddressTest6()
        {
            IPv6Address addr = new IPv6Address("2001:DB8::");

            var newAddr = addr.IncrementBy(65535);

            Assert.AreEqual("2001:db8::ffff", newAddr.ToString());
        }

        [Test]
        public void IPv6AddressTest7()
        {
            IPv6Address addr = new IPv6Address("2001:DB8::");

            var newAddr = addr.IncrementBy(4294967295);

            Assert.AreEqual("2001:db8::ffff:ffff", newAddr.ToString());
        }

        [Test]
        public void SubnetV6Test1()
        {
            IPv6Address addr = new IPv6Address("2001:DB8::1");

            var subnetV6 = new SubnetV6(addr, 64);

            Assert.AreEqual("2001:db8::", subnetV6.GetNetAddress().ToString());
        }

        [Test]
        public void SubnetV6Test2()
        {
            IPv6Address addr = new IPv6Address("2001:DB8::1:FFFF:FFFF:FFFF:FFFF");

            var subnetV6 = new SubnetV6(addr, 64);

            Assert.AreEqual("2001:db8:0:1::", subnetV6.GetNetAddress().ToString());
        }

        [Test]
        public void SubnetV6Test3()
        {
            var subnetV6 = new SubnetV6(new IPv6Address("2BCD::FACE:1:BEFF:FEBE:CAFE"), 56);

            Assert.AreEqual("2bcd:0:0:fa00::", subnetV6.GetNetAddress().ToString());
        }

        private SubnetMatchResult<SubnetV6, IPv6Address> Match(string netmaskStr, int mask, string addressStr)
        {
            var subnet = new SubnetV6(new IPv6Address(netmaskStr.ToLower()), mask);
            var address = new IPv6Address(addressStr.ToLower());
            return subnet.Match(address);
        }

        [Test]
        public void SubnetV6MatchTest1()
        {
            Assert.IsTrue(Match("2001:db8:0:1::", 64, "2001:DB8::1:FFFF:FFFF:FFFF:FFFF").IsMatch);
        }

        [Test]
        public void SubnetV6MatchTest2()
        {
            Assert.IsFalse(Match("2001:db8:0:1::", 128, "2001:DB8::1:FFFF:FFFF:FFFF:FFFF").IsMatch);
        }

        [Test]
        public void SubnetV6MatchTest3()
        {
            Assert.IsTrue(Match("::", 0, "2001:DB8::1:FFFF:FFFF:FFFF:FFFF").IsMatch);
        }

        [Test]
        public void SubnetV6MatchTest4()
        {
            Assert.IsTrue(Match("3124:0:0:DEA0::", 60, "3124::DEAD:CAFE:FF:FE00:1").IsMatch);
        }

        [Test]
        public void IPv6ExpandTest1()
        {
            IPv6Address addr = new IPv6Address("2001:DB8::1:FFFF:FFFF:FFFF:FFFF");

            Assert.AreEqual("2001:0db8:0000:0001:ffff:ffff:ffff:ffff", addr.Expand());
        }

        [Test]
        public void IPv6ExpandTest2()
        {
            IPv6Address addr = new IPv6Address("2340:0:10:100:1000:ABCD:101:1010".ToLower());

            Assert.AreEqual("2340:0000:0010:0100:1000:ABCD:0101:1010".ToLower(), addr.Expand());
        }

        [Test]
        public void IPv6ExpandTest3()
        {
            IPv6Address addr = new IPv6Address("FE80::DEAD:BEFF:FEEF:CAFE".ToLower());

            Assert.AreEqual("FE80:0000:0000:0000:DEAD:BEFF:FEEF:CAFE".ToLower(), addr.Expand());
        }

        [Test]
        public void EUI64Test1()
        {
            var subnetV6 = new SubnetV6(new IPv6Address("2001:DB8:1:1::"), 64);

            Assert.AreEqual("2001:DB8:1:1:213:ABFF:FEAB:1001".ToLower(), subnetV6.GetEUI64("00:13:AB:AB:10:01").ToString());
        }

        [Test]
        public void EUI64Test2()
        {
            var subnetV6 = new SubnetV6(new IPv6Address("2001:DB8:1:1::"), 64);

            Assert.AreEqual("2001:DB8:1:1:20C:BEFF:FEEF:CAFE".ToLower(), subnetV6.GetEUI64("00:0C:BE:EF:CA:FE").ToString());
        }

        [Test]
        public void GetRandomAddressTest()
        {
            var subnetV6 = Helper.GetRandomIPv6Subnet();

            Assert.Pass();
        }

        [Test]
        public void GetRandomEUITest()
        {
            var subnetV6 = Helper.GetRandomIPv6Subnet(64,64);

            var netSubnet = subnetV6.GetNetSubnet();

            var eui64 = subnetV6.GetEUI64(Helper.GenerateRandomMAC());

            Assert.IsTrue(netSubnet.Match(eui64).IsMatch);

        }
    }
}