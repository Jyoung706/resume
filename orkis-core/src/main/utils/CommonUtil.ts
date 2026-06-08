/***
 * .env class divider utility function
 * @param target
 * @param keyArr
 * @param value
 */
export const getSplittedEnv = (target: any, keyArr: any, value: any) => {
  if (keyArr.length == 1) {
    if (target[keyArr[0]]) {
      if (!(target[keyArr[0]] instanceof Array)) {
        let duplicateOptionArr = [];
        duplicateOptionArr.push(target[keyArr[0]]);
        duplicateOptionArr.push(value);
        target[keyArr[0]] = duplicateOptionArr;
      } else {
        target[keyArr[0]].push(value);
      }
    } else {
      target[keyArr[0]] = value;
    }

    return target;
  }

  if (!target[keyArr[0]]) target[keyArr[0]] = {};

  target[keyArr[0]] = getSplittedEnv(target[keyArr[0]], keyArr.slice(1), value);
  return target;
};
