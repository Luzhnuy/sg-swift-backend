// export class ColumnNumericTransformer implements ValueTransformer {
export const ColumnNumericTransformer = {

  to: (data) => {
    if (typeof data !== 'undefined' && data !== null) {
      return data;
    }
    return null;
  },

  from: (data) => {
    if (typeof data !== 'undefined' && data !== null) {
      const res = parseFloat(data)
      if (isNaN(res)) {
        return null;
      } else {
        return res;
      }
    }
    return null;
  },
};
