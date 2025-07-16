import { join } from 'path';
import { promises as fs } from 'fs';

/**
 * 将对象保存为JSON文件到本地
 * @param data 要保存的对象数据
 * @param filename 文件名称
 * @param filePath 文件路径
 * @param options 选项配置
 * @param options.pretty 是否格式化JSON，默认为true
 * @param options.encoding 文件编码，默认为utf-8
 * @returns 成功保存返回true，失败返回错误对象
 */
export async function saveObjectToJsonFile(
  data: unknown,
  filename: string,
  filePath: string = process.cwd(),
  options: { pretty?: boolean; encoding?: BufferEncoding } = {},
): Promise<{ status: boolean; error?: string; details?: unknown }> {
  try {
    const { pretty = true, encoding = 'utf-8' } = options;
    // 将对象转换为JSON字符串
    const jsonString = pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    const path = join(filePath, filename);
    // 写入文件
    await fs.writeFile(path, jsonString, { encoding });
    console.log(`JSON文件已成功保存到: ${path}`);
    return { status: true };
  } catch (error) {
    console.error('保存JSON文件时出错:', error);
    return {
      status: false,
      error: '保存文件失败',
      details: error instanceof Error ? error.message : error,
    };
  }
}
