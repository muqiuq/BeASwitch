using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;
using System.Windows.Threading;

namespace BeARouter
{
    public class IPv4Packet
    {

        public readonly string SourceMAC;
        public readonly string DestMAC;

        public readonly IPv4Address SourceIP;
        public readonly IPv4Address DestIP;

        public readonly string Content;

        public IPv4Packet(string sourceMAC, string destMAC, IPv4Address sourceIP, IPv4Address destIP, string content = "")
        {
            SourceMAC = sourceMAC;
            DestMAC = destMAC;
            SourceIP = sourceIP;
            DestIP = destIP;
            Content = content;
        }


        public void AttachToGrid(Grid mainGrid, double left, double top)
        {
            var backgroundRectangle = new Rectangle();
            backgroundRectangle.Margin = new Thickness(10, 10, 10, 10);
            backgroundRectangle.VerticalAlignment = VerticalAlignment.Stretch;
            backgroundRectangle.HorizontalAlignment = HorizontalAlignment.Stretch;
            backgroundRectangle.Fill = Brushes.LightGreen;
            backgroundRectangle.Stroke = Brushes.Red;
            backgroundRectangle.StrokeThickness = 3;

            var width = 410;
            var height = 100;

            var splitLine = new Line()
            {
                Stroke = Brushes.Black,
                StrokeThickness = 2,
                X1 = width / 2,
                X2 = width / 2,
                Y1 = 13,
                Y2 = 55
            };
            var macRowLine = new Line()
            {
                Stroke = Brushes.Black,
                StrokeThickness = 2,
                X1 = 13,
                X2 = width - 13,
                Y1 = 32,
                Y2 = 32
            };
            var macDest = new TextBlock()
            {
                Text = $"Dest MAC: {DestMAC}",
                VerticalAlignment = VerticalAlignment.Top,
                HorizontalAlignment = HorizontalAlignment.Left,
                Margin = new Thickness(15, 15, 11, 0),
                FontSize = 14,
                FontFamily = new FontFamily("Courier New"),
                TextAlignment = TextAlignment.Left,
            };
            var macSource = new TextBlock()
            {
                Text = $"Source MAC: {SourceMAC}",
                VerticalAlignment = VerticalAlignment.Top,
                HorizontalAlignment = HorizontalAlignment.Left,
                Margin = new Thickness(width / 2 + 5, 15, 0, 0),
                FontSize = 14,
                FontFamily = new FontFamily("Courier New"),
                TextAlignment = TextAlignment.Left,
            };
            var ipRowLine = new Line()
            {
                Stroke = Brushes.Black,
                StrokeThickness = 1,
                X1 = 13,
                X2 = width - 13,
                Y1 = 55,
                Y2 = 55
            };
            var ipSrcText = new TextBlock()
            {
                Text = $"Source IP: {SourceIP}",
                VerticalAlignment = VerticalAlignment.Top,
                HorizontalAlignment = HorizontalAlignment.Left,
                Margin = new Thickness(15, 35, 0, 0),
                FontSize = 13,
                FontFamily = new FontFamily("Courier New"),
                TextAlignment = TextAlignment.Left,
            };
            var ipDestText = new TextBlock()
            {
                Text = $"Dest IP: {DestIP}",
                VerticalAlignment = VerticalAlignment.Top,
                Margin = new Thickness(width/2 + 5, 35, 0, 0),
                HorizontalAlignment = HorizontalAlignment.Left,
                FontSize = 13,
                FontFamily = new FontFamily("Courier New"),
                TextAlignment = TextAlignment.Left,
            };

            var startingPosition = new Thickness(left - width, top, 0, 0);

            var BaseGrid = new Grid()
            {
                Height = height,
                Width = 0,
                Margin = startingPosition,
                VerticalAlignment = VerticalAlignment.Top,
                HorizontalAlignment = HorizontalAlignment.Left
            };

            /*var thicknessAnimationGrid = new ThicknessAnimationUsingKeyFrames();
            thicknessAnimationGrid.KeyFrames.Add(new SplineThicknessKeyFrame(new Thickness(100, 100, 0, 0), KeyTime.FromTimeSpan(new TimeSpan(0,0,0,0,0))));
            thicknessAnimationGrid.KeyFrames.Add(new SplineThicknessKeyFrame(new Thickness(left, top, 0, 0), KeyTime.FromTimeSpan(new TimeSpan(0, 0, 0, 5, 0))));*/

            var animationDuration = new Duration(new TimeSpan(0, 0, 0, 0, 500));
            var thicknessAnimationGrid = new ThicknessAnimation(startingPosition, new Thickness(left, top, 0, 0), animationDuration);

            var myDoubleAnimationOpacity = new DoubleAnimation()
            {
                From = 0,
                To = 1,
                Duration = animationDuration
            };
            var myDoubleAnimationWidth = new DoubleAnimation()
            {
                From = 0,
                To = width,
                Duration = animationDuration
            };
            var myDoubleAnimationHeight = new DoubleAnimation()
            {
                From = 0,
                To = height,
                Duration = animationDuration
            };
            var storyBoard = new Storyboard();
            //storyBoard.Children.Add(myDoubleAnimationHeight);
            storyBoard.Children.Add(myDoubleAnimationWidth);
            storyBoard.Children.Add(thicknessAnimationGrid);
            storyBoard.Children.Add(myDoubleAnimationOpacity);

            Storyboard.SetTargetProperty(myDoubleAnimationOpacity, new PropertyPath(Grid.OpacityProperty));
            Storyboard.SetTargetProperty(thicknessAnimationGrid, new PropertyPath(Grid.MarginProperty));
            Storyboard.SetTargetProperty(myDoubleAnimationWidth, new PropertyPath(Grid.WidthProperty));
            Storyboard.SetTargetProperty(myDoubleAnimationHeight, new PropertyPath(Grid.HeightProperty));
            

            BaseGrid.Children.Add(backgroundRectangle);
            BaseGrid.Children.Add(macRowLine);
            BaseGrid.Children.Add(macDest);
            BaseGrid.Children.Add(macSource);
            BaseGrid.Children.Add(ipRowLine);
            BaseGrid.Children.Add(ipSrcText);
            BaseGrid.Children.Add(ipDestText);
            BaseGrid.Children.Add(splitLine);

            mainGrid.Children.Add(BaseGrid);

            var t = new Thread(() =>
            {
                Thread.Sleep(2000);
                ((Window)(mainGrid.Parent)).Dispatcher.Invoke(() =>
                {
                    storyBoard.Begin(BaseGrid);
                });
            });
            t.Start();
            
        }
    }
}
