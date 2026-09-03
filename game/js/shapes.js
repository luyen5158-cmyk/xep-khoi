/* shapes.js — 26 hình khối và 8 màu.
 *
 * Mỗi hình là danh sách toạ độ [hàng, cột] tính từ góc trên-trái.
 * Vì luật R2 cấm xoay khối, mỗi hướng của chữ L phải khai báo thành hình riêng.
 * lv = level bắt đầu xuất hiện. Dữ liệu thuần, không đụng tới trình duyệt.
 */
"use strict";

export const SHAPES = [
  { id:  0, lv: 1, cells: [[0,0]] },                                    // 1 ô
  { id:  1, lv: 1, cells: [[0,0],[0,1]] },                              // ngang 2
  { id:  2, lv: 1, cells: [[0,0],[1,0]] },                              // dọc 2
  { id:  3, lv: 1, cells: [[0,0],[0,1],[0,2]] },                        // ngang 3
  { id:  4, lv: 1, cells: [[0,0],[1,0],[2,0]] },                        // dọc 3
  { id:  5, lv: 1, cells: [[0,0],[0,1],[1,0],[1,1]] },                  // vuông 2×2
  { id:  6, lv: 2, cells: [[0,0],[1,0],[1,1]] },                        // L nhỏ ↰
  { id:  7, lv: 2, cells: [[0,0],[0,1],[1,0]] },                        // L nhỏ ↱
  { id:  8, lv: 2, cells: [[0,0],[0,1],[1,1]] },                        // L nhỏ ↲
  { id:  9, lv: 2, cells: [[0,1],[1,0],[1,1]] },                        // L nhỏ ↳
  { id: 10, lv: 2, cells: [[0,0],[0,1],[0,2],[0,3]] },                  // ngang 4
  { id: 11, lv: 2, cells: [[0,0],[1,0],[2,0],[3,0]] },                  // dọc 4
  { id: 12, lv: 3, cells: [[0,0],[1,0],[2,0],[2,1]] },                  // L dài
  { id: 13, lv: 3, cells: [[0,1],[1,1],[2,1],[2,0]] },                  // J dài
  { id: 14, lv: 3, cells: [[0,0],[0,1],[0,2],[1,0]] },                  // L ngang
  { id: 15, lv: 3, cells: [[0,0],[0,1],[0,2],[1,2]] },                  // J ngang
  { id: 16, lv: 3, cells: [[0,0],[0,1],[1,1],[1,2]] },                  // chữ S
  { id: 17, lv: 3, cells: [[0,1],[0,2],[1,0],[1,1]] },                  // chữ Z
  { id: 18, lv: 4, cells: [[0,0],[0,1],[0,2],[1,1]] },                  // chữ T
  { id: 19, lv: 4, cells: [[1,0],[1,1],[1,2],[0,1]] },                  // chữ T ngược
  { id: 20, lv: 4, cells: [[0,0],[0,1],[0,2],[0,3],[0,4]] },            // ngang 5
  { id: 21, lv: 4, cells: [[0,0],[1,0],[2,0],[3,0],[4,0]] },            // dọc 5
  { id: 22, lv: 5, cells: [[0,1],[1,0],[1,1],[1,2],[2,1]] },            // dấu cộng
  { id: 23, lv: 5, cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]] },      // chữ nhật 2×3
  { id: 24, lv: 5, cells: [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]] },      // chữ nhật 3×2
  { id: 25, lv: 6, cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]] } // vuông 3×3
];

/* Tám màu cùng độ sáng, cùng độ bão hoà — không màu nào "nặng" hơn màu nào.
   Màu không mang ý nghĩa gì trong luật chơi, chỉ để mắt phân biệt khối. */
export const COLORS = [
  "#ff6b6b", // đỏ san hô
  "#ffa94d", // cam
  "#ffd43b", // vàng
  "#69db7c", // lục
  "#4dd4e8", // lam ngọc
  "#5c9dff", // xanh dương
  "#b197fc", // tím
  "#f783ac"  // hồng
];

/** Kích thước khung bao của một hình, tính bằng số ô. */
export function shapeBounds(cells) {
  let maxR = 0, maxC = 0;
  for (const [r, c] of cells) {
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  return { rows: maxR + 1, cols: maxC + 1 };
}
