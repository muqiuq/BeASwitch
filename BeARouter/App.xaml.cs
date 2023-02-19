using BeAUILibrary.AppStart;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;

namespace BeARouter
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            var welcomeWindow = new WelcomeWindow(Global.AppTypesToApplication);
            welcomeWindow.Show();
        }
    }
}
