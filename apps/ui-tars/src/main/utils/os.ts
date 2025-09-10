import { homedir } from 'os';
import { join } from 'path';
import { Options, ProcessDescriptor } from 'ps-list';
import { exec } from 'child_process';

export const AgentDataPath = join(homedir(), '/Desktop/UI_TARS_AGENT');

let psList: (options?: Options) => Promise<ProcessDescriptor[]> | undefined;
async function loadPsList() {
  if (!psList) {
    psList = (await import('ps-list')).default; // 只在第一次调用时加载
  }
  return psList;
}

// 获取当前打开的程序
export async function getCurrentApps() {
  const psList = await loadPsList();
  if (!psList) {
    return [];
  }
  const processes = await psList();
  if (!processes) {
    return [];
  }
  return processes.map((proc) => proc.name); // 返回程序名称列表
}

// 关闭程序的函数
export function closeOpenedApps(appNames: string[]) {
  appNames.forEach((appName) => {
    let command;
    if (process.platform === 'win32') {
      command = `taskkill /IM ${appName} /F`;
    } else if (process.platform === 'darwin') {
      command = `pkill -f ${appName}`;
    } else if (process.platform === 'linux') {
      command = `pkill ${appName}`;
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error closing app ${appName}: ${stderr}`);
        return;
      }
      console.log(`Closed app: ${appName}`);
    });
  });
}
