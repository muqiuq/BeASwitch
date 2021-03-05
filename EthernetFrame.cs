using System;
using System.Collections.Generic;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Shapes;

namespace BeASwitch
{
    public class EthernetFrame
    {
        public SwitchPort AttachedCurrentlyToSwitchPort { get; private set; }

        private Rectangle backgroundRectangle;
        private Border macBorder;
        private Border vlanBorder;

        public EthernetFrame(EthernetHost sourceHost, string destMac, int? vlanTag, string content)
        {
            SourceHost = sourceHost;
            DestMac = destMac;
            this.vlanTag = vlanTag;
            this.content = content;
        }

        public EthernetHost SourceHost { get; private set; }
        public string DestMac { get; private set; }

        public int? vlanTag { get; private set; }

        public string content { get; private set; }

        public void DetachFromSwitchPort()
        {
            if(AttachedCurrentlyToSwitchPort != null)
            {
                AttachedCurrentlyToSwitchPort.BaseGrid.Children.Remove(backgroundRectangle);
                AttachedCurrentlyToSwitchPort.BaseGrid.Children.Remove(macBorder);
                AttachedCurrentlyToSwitchPort.BaseGrid.Children.Remove(vlanBorder);
            }
        }

        public void AttachPackageToSwitchPort(SwitchPort switchPort)
        {
            DetachFromSwitchPort();
            AttachedCurrentlyToSwitchPort = switchPort;
            backgroundRectangle = new Rectangle();
            backgroundRectangle.Margin = new Thickness(10, 10, 10, 10);
            backgroundRectangle.VerticalAlignment = VerticalAlignment.Stretch;
            backgroundRectangle.HorizontalAlignment = HorizontalAlignment.Stretch;
            backgroundRectangle.Fill = Brushes.LightBlue;
            backgroundRectangle.Stroke = Brushes.Red;
            backgroundRectangle.StrokeThickness = 3;
            Grid.SetRow(backgroundRectangle, 0);
            Grid.SetColumn(backgroundRectangle, 1);
            macBorder = new Border()
            {
                BorderBrush = Brushes.Black,
                BorderThickness = new Thickness(0, 0, 0, 0.5),
                VerticalAlignment = VerticalAlignment.Top,
                HorizontalAlignment = HorizontalAlignment.Stretch,
                Margin = new Thickness(11, 15, 11, 0),
            };
            var mac = new TextBlock()
            {
                Text = $"Ziel MAC: {DestMac}  |  Quell MAC: {SourceHost.MAC}",
                VerticalAlignment = VerticalAlignment.Stretch,
                HorizontalAlignment = HorizontalAlignment.Stretch,
                FontSize = 13,
                TextAlignment = TextAlignment.Center,
            };
            macBorder.Child = mac;
            vlanBorder = new Border()
            {
                BorderBrush = Brushes.Black,
                BorderThickness = new Thickness(0, 0, 0, 0.5),
                VerticalAlignment = VerticalAlignment.Top,
                HorizontalAlignment = HorizontalAlignment.Stretch,
                Margin = new Thickness(11, 35, 11, 0),
            };
            var vlan = new TextBlock()
            {
                VerticalAlignment = VerticalAlignment.Stretch,
                HorizontalAlignment = HorizontalAlignment.Stretch,
                FontSize = 13,
                TextAlignment = TextAlignment.Center,
            };
            if (vlanTag != null) vlan.Text = $"VLAN TAG: {vlanTag}";
            vlanBorder.Child = vlan;

            Grid.SetRow(macBorder, 0);
            Grid.SetColumn(macBorder, 1);
            Grid.SetRow(vlanBorder, 0);
            Grid.SetColumn(vlanBorder, 1);

            switchPort.BaseGrid.Children.Add(backgroundRectangle);
            switchPort.BaseGrid.Children.Add(macBorder);
            switchPort.BaseGrid.Children.Add(vlanBorder);
        }

    }
}
