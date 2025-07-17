import { ipcMain } from 'electron';
import { v5 } from 'uuid';
import {
  exportDataToJsonFile,
  exportTaskToJsonFile,
} from '../utils/task/index';
import { ConversationWithSoM } from '../shared/types';
import {
  ExportConversationData,
  ExportCurrentConversationData,
  TaskData,
  TrajectoryStatusEnum,
} from '../utils/task/type';
import { getScreenSize } from '../utils/screen';
import { RETYR_KEYWORDS } from '../utils/task/constants';

function splitByHumanStart(data: ConversationWithSoM[]) {
  const result: ConversationWithSoM[][] = [];
  let currentGroup: ConversationWithSoM[] = [];

  for (const [index, item] of data.entries()) {
    if (item.from === 'human' && item.value !== '<image>' && item.timing) {
      if (currentGroup.length > 0) {
        result.push(currentGroup);
      }
      currentGroup = [item];
    } else {
      // 如果还没有 human 开头，忽略
      if (currentGroup.length > 0) {
        currentGroup.push(item);
      }
    }
  }

  if (currentGroup.length > 2) {
    result.push(currentGroup);
  }

  return result;
}

const generateStableUuid = (namespace: string, input: string) => {
  return v5(input, namespace);
};

function normalizeTaskData({
  id,
  os,
  instruction,
  conversations,
  screenSize,
}: {
  id: string;
  os: string;
  instruction: string;
  conversations: ConversationWithSoM[];
  screenSize: Electron.Size;
}): TaskData {
  const trajectory: TaskData['trajectory'] = [];
  let trajectory_type =
    [
      ...(conversations[conversations.length - 1].predictionParsed || []),
    ]?.reverse()[0]?.action_type === 'finished'
      ? TrajectoryStatusEnum.finished
      : TrajectoryStatusEnum.failed;

  let step = 0;
  let image: undefined | string;
  let image_annotation: undefined | string;
  const screenResolution = { ...screenSize };
  conversations.forEach((con) => {
    if (con.screenshotContext) {
      screenResolution.width = con.screenshotContext.size.width;
      screenResolution.height = con.screenshotContext.size.height;
    }
    // 截图数据取当前消息的图片或者前一次消息的图片
    if (con.screenshotBase64) {
      image = con.screenshotBase64;
    }

    if (con.screenshotBase64WithElementMarker) {
      image_annotation = con.screenshotBase64WithElementMarker;
    }

    const predictionParsed = con.predictionParsed?.[0];
    if (predictionParsed) {
      if (
        trajectory_type === TrajectoryStatusEnum.finished &&
        RETYR_KEYWORDS.some((key) => predictionParsed.thought.includes(key))
      ) {
        trajectory_type = TrajectoryStatusEnum.retry_finished;
      }
      trajectory.push({
        observation: image,
        observation_annotation: image_annotation,
        think: predictionParsed.thought,
        step_id: step,
        action:
          predictionParsed.action_type === 'finished'
            ? 'STATUS_TASK_COMPLETE'
            : predictionParsed.action_type.toLocaleUpperCase(),
        ...(Object.keys(predictionParsed.action_inputs).length > 0 && {
          action_type: predictionParsed.action_type,
          action_inputs: predictionParsed.action_inputs,
        }),
      });
      image = undefined;
      image_annotation = undefined;
      step += 1;
    }
  });

  return {
    os: os,
    episode_id: id,
    screen_resolution: screenSize,
    instruction,
    trajectory,
    trajectory_type,
  };
}

export function registerTaskHandlers() {
  ipcMain.handle(
    'task:exportConversation',
    async (_, params: ExportConversationData) => {
      try {
        await exportDataToJsonFile(params);
        const { data, folder } = params;
        const { logicalSize } = getScreenSize();
        await Promise.all(
          splitByHumanStart(data.conversations).map((con, i) => {
            const id = generateStableUuid(
              data.sessionId,
              `${con[0].value}${con[0].timing?.start ?? i}`,
            );
            return exportTaskToJsonFile({
              data: normalizeTaskData({
                id,
                os: process.platform,
                instruction: con[0].value,
                conversations: con.slice(1),
                screenSize: logicalSize,
              }),
              filename: 'task.json',
              folder: `${folder}/${con[0].value}_${con[0].timing?.start}`,
            });
          }),
        );
        return {
          status: true,
        };
      } catch (error) {
        return {
          status: false,
          error: '保存文件失败',
          details: error instanceof Error ? error.message : error,
        };
      }
    },
  );

  ipcMain.handle(
    'task:exportTask',
    async (_, params: ExportCurrentConversationData) => {
      try {
        const { data, folder } = params;
        const { logicalSize } = getScreenSize();
        await Promise.all(
          splitByHumanStart(data.conversations).map((con, i) => {
            const id = generateStableUuid(
              data.sessionId,
              `${con[0].value}${con[0].timing?.start ?? i}`,
            );
            return exportTaskToJsonFile({
              data: normalizeTaskData({
                id,
                os: process.platform,
                instruction: con[0].value,
                conversations: con.slice(1),
                screenSize: logicalSize,
              }),
              filename: 'task.json',
              folder: `${folder}/${con[0].value}_${con[0].timing?.start}`,
            });
          }),
        );
        return {
          status: true,
        };
      } catch (error) {
        return {
          status: false,
          error: '保存文件失败',
          details: error instanceof Error ? error.message : error,
        };
      }
    },
  );
}
