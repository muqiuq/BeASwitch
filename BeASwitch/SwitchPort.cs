using System;
using System.Collections.Generic;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;

namespace BeASwitch
{
    public class SwitchPort
    {
        delegate void CheckBoxConfigDelegate(CheckBox c, int row);
        public List<int> Tagged = new List<int>();
        public List<int> Untagged = new List<int>();

        public bool IsVlanTagged(int vlan)
        {
            return Tagged.Contains(vlan);
        }

        public Grid BaseGrid;

        public SwitchPort(int number)
        {
            this.Num = number;
            Untagged.Add(1);
        }

        public List<int> GetAvaiableVlans()
        {
            var vlans = new List<int>();

            Tagged.ForEach(i => { if (!vlans.Contains(i)) vlans.Add(i); });
            Untagged.ForEach(i => { if (!vlans.Contains(i)) vlans.Add(i); });

            return vlans;
        }

        public int Num { get; }
        public CheckBox CheckBoxSend { get; private set; }
        public CheckBox CheckBoxTag { get; private set; }

        public Grid AttachToGrid(Grid mainGrid, double left, double top, bool showVLANTagCheckbox)
        {
            BaseGrid = new Grid()
            {
                Height = 150,
                Width = 300,
                Margin = new Thickness(left, top, 0, 0),
                VerticalAlignment = VerticalAlignment.Top,
                HorizontalAlignment = HorizontalAlignment.Left
            };
            var backgroundRecktangle = new Rectangle()
            {
                Stroke = Brushes.Gray,
                StrokeThickness = 2,
                Height = 156,
                Width = 306,
                Margin = new Thickness(left - 3, top - 3, 0, 0),
                VerticalAlignment = VerticalAlignment.Top,
                HorizontalAlignment = HorizontalAlignment.Left
            };
            BaseGrid.RowDefinitions.Add(new RowDefinition() { Height = new GridLength(100) });
            BaseGrid.RowDefinitions.Add(new RowDefinition() { Height = new GridLength(25) });
            BaseGrid.RowDefinitions.Add(new RowDefinition() { Height = new GridLength(25) });
            BaseGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(100) });
            BaseGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(200) });
            var image1 = new Image()
            {
                HorizontalAlignment = HorizontalAlignment.Stretch,
                VerticalAlignment = VerticalAlignment.Stretch,
                Source = new BitmapImage(new Uri($"pack://application:,,,/{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name};component/images/rj45.png"))
            };
            Grid.SetRow(image1, 0); Grid.SetColumn(image1, 0);
            BaseGrid.Children.Add(image1);
            var textBlockPort = new TextBlock()
            {
                Text = $"Port {Num}",
                TextAlignment = TextAlignment.Center,
                FontWeight = FontWeights.Bold,
                FontSize = 14,
            };
            Grid.SetRow(textBlockPort, 1);
            var textBlockVLAN = new TextBlock()
            {
                Text = $"{VlanToString()}",
                TextAlignment = TextAlignment.Center,
                FontSize = 14,
                Visibility = showVLANTagCheckbox ? Visibility.Visible : Visibility.Hidden
            };
            Grid.SetRow(textBlockVLAN, 2);
            CheckBoxSend = new CheckBox()
            {
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Center,
                Content = "Send to this port"
            };
            CheckBoxTag = new CheckBox()
            {
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Center,
                Visibility = showVLANTagCheckbox ? Visibility.Visible : Visibility.Hidden,
                Content = "Add tag (802.1Q)"
            };
            
            CheckBoxConfigDelegate ajustCheckBox = (x, n) =>
            {
                ScaleTransform scale = new ScaleTransform(1.5, 1.5);
                x.RenderTransformOrigin = new Point(0.5, 0.5);
                x.RenderTransform = scale;
                Grid.SetRow(x, n);
                Grid.SetColumn(x, 1);
                BaseGrid.Children.Add(x);
            };
            ajustCheckBox(CheckBoxSend, 1);
            ajustCheckBox(CheckBoxTag, 2);
            
            BaseGrid.Children.Add(textBlockPort);
            BaseGrid.Children.Add(textBlockVLAN);
            mainGrid.Children.Add(BaseGrid);
            mainGrid.Children.Add(backgroundRecktangle);
            return BaseGrid;
        }

        internal void ClearMarks()
        {
            CheckBoxTag.Background = Brushes.White;
            CheckBoxSend.Background = Brushes.White;
        }

        internal void ClearCheckBoxes()
        {
            CheckBoxTag.IsChecked = false;
            CheckBoxSend.IsChecked = false;
        }

        internal void MarkForTag()
        {
            CheckBoxTag.Background = CheckBoxTag.IsChecked.Value ? Brushes.LimeGreen : Brushes.Red;
        }

        internal void MarkForSend()
        {
            CheckBoxSend.Background = CheckBoxSend.IsChecked.Value ? Brushes.LimeGreen : Brushes.Red;
        }

        public string VlanToString()
        {
            var buf = new List<string>();
            foreach(var u in Untagged)
            {
                buf.Add($"{u}U");
            }
            foreach (var u in Tagged)
            {
                buf.Add($"{u}T");
            }
            return String.Join(",", buf);
        }

        internal void MarkCheckBox()
        {
            CheckBoxSend.IsChecked = true;
        }
    }
}
