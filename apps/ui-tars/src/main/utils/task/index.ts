import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import { AgentDataPath } from '../os';
import { ExportTaskData, ExportDataParams } from './type';

export async function exportDataToJsonFile(
  params: ExportDataParams,
): Promise<{ status: boolean; error?: string; details?: unknown }> {
  try {
    const { data, filename, folder = '', options = {} } = params;
    const { pretty = true, encoding = 'utf-8' } = options;
    const jsonString = pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
    const path = join(AgentDataPath, folder, filename);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, jsonString, { encoding });
    return { status: true };
  } catch (error) {
    return {
      status: false,
      error: '保存文件失败',
      details: error instanceof Error ? error.message : error,
    };
  }
}

export async function saveBase64Image(base64: string, outputPath: string) {
  // 如果 base64 有前缀，则去掉前缀
  const matches = base64.match(/^data:image\/\w+;base64,(.+)$/);
  const pureBase64 = matches ? matches[1] : base64;
  // 转为 Buffer
  const buffer = Buffer.from(pureBase64, 'base64');
  // 写入文件
  await fs.writeFile(outputPath, new Uint8Array(buffer));
  console.log(`图片已保存: ${outputPath}`);
}

export async function exportTaskToJsonFile(
  params: ExportDataParams<ExportTaskData>,
): Promise<{ status: boolean; error?: string; details?: unknown }> {
  try {
    const { data, filename, options = {} } = params;
    const { pretty = true, encoding = 'utf-8' } = options;
    const folder = join(AgentDataPath, params.folder || '');

    for (let index = 0; index < data.trajectory.length; index++) {
      const item = data.trajectory[index];
      if (item.observation) {
        try {
          const filename = `/screenshots/${item.step_id}.jpeg`;
          const filepath = join(folder, filename);
          await fs.mkdir(dirname(filepath), { recursive: true });
          await saveBase64Image(item.observation, filepath);
          item.observation = filename;
        } catch (error) {
          console.log(
            '保存图片失败：',
            error instanceof Error ? error.message : error,
          );
        }
      }
      if (item.observation_annotation) {
        try {
          const filename = `/screenshots/${item.step_id}_annotation.jpeg`;
          const filepath = join(folder, filename);
          await fs.mkdir(dirname(filepath), { recursive: true });
          await saveBase64Image(item.observation_annotation, filepath);
          item.observation_annotation = filename;
        } catch (error) {
          console.log(
            '保存图片失败：',
            error instanceof Error ? error.message : error,
          );
        }
      }
    }
    const jsonString = pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
    const path = join(folder, filename);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, jsonString, { encoding });
    return { status: true };
  } catch (error) {
    return {
      status: false,
      error: '保存文件失败',
      details: error instanceof Error ? error.message : error,
    };
  }
}
