# Ouvre la discussion WhatsApp Desktop du numero et y colle l'image : elle apparait
# dans l'apercu d'envoi, il ne reste qu'a appuyer sur Entree. Rien n'est envoye ici.
# Appele par utils/whatsappDesktop.js (Windows, session utilisateur ouverte).
param(
  [Parameter(Mandatory = $true)][string]$ImagePath,
  [Parameter(Mandatory = $true)][ValidatePattern('^\d{6,15}$')][string]$Phone
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type @'
using System; using System.Runtime.InteropServices; using System.Text;
public static class DesktopInput {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr handle, out RECT rect);
  [DllImport("user32.dll")] static extern int GetWindowText(IntPtr handle, StringBuilder text, int length);
  [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] static extern void mouse_event(uint flags, int x, int y, uint data, UIntPtr extra);
  [DllImport("user32.dll")] static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra);
  public static string Title(IntPtr handle) { var text = new StringBuilder(256); GetWindowText(handle, text, 256); return text.ToString(); }
  public static void Click(int x, int y) { SetCursorPos(x, y); mouse_event(0x02, 0, 0, 0, UIntPtr.Zero); mouse_event(0x04, 0, 0, 0, UIntPtr.Zero); }
  public static void CtrlV() {
    keybd_event(0x11, 0, 0, UIntPtr.Zero); keybd_event(0x56, 0, 0, UIntPtr.Zero);
    keybd_event(0x56, 0, 2, UIntPtr.Zero); keybd_event(0x11, 0, 2, UIntPtr.Zero);
  }
}
'@
# Coordonnees en pixels reels, quel que soit le zoom d'affichage de Windows.
[void][DesktopInput]::SetProcessDPIAware()

$image = [System.Drawing.Image]::FromFile($ImagePath)
try {
  [System.Windows.Forms.Clipboard]::SetImage($image)
} finally {
  $image.Dispose()
}

# WhatsApp deja lance : la discussion s'ouvre vite. Sinon, laisser le temps au demarrage.
$alreadyRunning = [bool](Get-Process -Name 'WhatsApp*' -ErrorAction SilentlyContinue)
Start-Process "whatsapp://send?phone=$Phone"
Start-Sleep -Milliseconds $(if ($alreadyRunning) { 3500 } else { 8000 })

# Le lien whatsapp:// met WhatsApp au premier plan (AppActivate n'est pas fiable avec lui).
$window = [DesktopInput]::GetForegroundWindow()
$title = [DesktopInput]::Title($window)
if ($title -notlike '*WhatsApp*') { throw "WhatsApp n'est pas au premier plan (fenetre active : $title)" }

# A l'ouverture, le curseur n'est pas dans la zone de saisie : un Ctrl+V seul serait perdu.
# Clic dans la barre « Entrez un message » (bas de la discussion), puis Ctrl+V.
$rect = New-Object DesktopInput+RECT
[void][DesktopInput]::GetWindowRect($window, [ref]$rect)
[DesktopInput]::Click([int]($rect.Left + ($rect.Right - $rect.Left) * 0.65), [int]($rect.Bottom - 50))
Start-Sleep -Milliseconds 300
[DesktopInput]::CtrlV()
