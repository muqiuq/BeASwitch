using BeAUILibrary.AppStart;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;

namespace BeASwitch
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);
            var mainWindow = new MainWindow();
            var welcomeWindow = new WelcomeWindow(new Dictionary<AppTypes, IWelcomeUserConfig>()
            {
                { AppTypes.BeASwitch, mainWindow}
            });
            this.MainWindow = mainWindow;
            welcomeWindow.Show();
        }
    }
}
