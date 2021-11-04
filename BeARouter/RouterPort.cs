using System;
using System.Collections.Generic;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;

namespace BeARouter
{
    public class RouterPort
    {
        delegate void CheckBoxConfigDelegate(CheckBox c, int row);

        public Grid BaseGrid;

        public List<Subnet> ipv4Addresses = new List<Subnet>();

        public RouterPort(int number)
        {
            this.Num = number;
        }

        public string Name
        {
            get
            {
                return $"eth{Num}";
            }
        }

        public override string ToString()
        {
            return $"{Name}\tUP\t{string.Join(',', ipv4Addresses)}";
        }

        public int Num { get; }
        public CheckBox CheckBoxSend { get; private set; }

        public Grid AttachToGrid(Grid mainGrid, double left, double top)
        {
            BaseGrid = new Grid()
            {
                Height = 75,
                Width = 150,
                Margin = new Thickness(left, top, 0, 0),
                VerticalAlignment = VerticalAlignment.Top,
                HorizontalAlignment = HorizontalAlignment.Left
            };
            var backgroundRecktangle = new Rectangle()
            {
                Stroke = Brushes.Gray,
                StrokeThickness = 2,
                Height = 80,
                Width = 156,
                Margin = new Thickness(left - 3, top - 3, 0, 0),
                VerticalAlignment = VerticalAlignment.Top,
                HorizontalAlignment = HorizontalAlignment.Left,
                Fill = Brushes.White
            };
            BaseGrid.RowDefinitions.Add(new RowDefinition() { Height = new GridLength(50) });
            BaseGrid.RowDefinitions.Add(new RowDefinition() { Height = new GridLength(25) });
            BaseGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(100) });
            BaseGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(50) });
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
                Text = $"eth{Num}",
                TextAlignment = TextAlignment.Center,
                FontWeight = FontWeights.Bold,
                HorizontalAlignment = HorizontalAlignment.Stretch,
                VerticalAlignment = VerticalAlignment.Center,
                FontSize = 14,
            };
            Grid.SetRow(textBlockPort, 0);
            Grid.SetColumn(textBlockPort, 1);
            CheckBoxSend = new CheckBox()
            {
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Center,
                Content = "Send to this port",
                FontSize = 10,
            };
            
            CheckBoxConfigDelegate ajustCheckBox = (x, n) =>
            {
                ScaleTransform scale = new ScaleTransform(1.5, 1.5);
                x.RenderTransformOrigin = new Point(0.5, 0.5);
                x.RenderTransform = scale;
                Grid.SetRow(x, n);
                Grid.SetColumnSpan(x, 2);
                //Grid.SetColumn(x, 1);
                BaseGrid.Children.Add(x);
            };
            ajustCheckBox(CheckBoxSend, 2);
            mainGrid.Children.Add(backgroundRecktangle);
            BaseGrid.Children.Add(textBlockPort);
            mainGrid.Children.Add(BaseGrid);
            
            return BaseGrid;
        }

        internal void ClearMarks()
        {
            CheckBoxSend.Background = Brushes.White;
        }

        internal void ClearCheckBoxes()
        {
            CheckBoxSend.IsChecked = false;
        }

        internal void MarkForSend()
        {
            CheckBoxSend.Background = CheckBoxSend.IsChecked.Value ? Brushes.LimeGreen : Brushes.Red;
        }


    }
}
