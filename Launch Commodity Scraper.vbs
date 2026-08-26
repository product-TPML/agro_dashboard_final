Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
baseDir = fso.GetParentFolderName(WScript.ScriptFullName)
launcher = fso.BuildPath(baseDir, "Launch Commodity Scraper.cmd")
command = "cmd.exe /d /c call """ & launcher & """"
shell.Run command, 1, False
