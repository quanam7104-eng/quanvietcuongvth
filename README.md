# Tax Invoice Matcher

Yêu cầu xây dựng Website đối chiếu hóa đơn Thuế và EasyBooks

Tôi cần xây dựng một website/web app chuyên dùng để đối chiếu dữ liệu hóa đơn giữa file tải từ Cơ quan Thuế và dữ liệu xuất từ phần mềm kế toán EasyBooks nhằm phát hiện chính xác các hóa đơn bị sai lệch.

Mục tiêu

Giúp kế toán kiểm tra nhanh hàng nghìn hóa đơn mua vào, bán ra và xác định chính xác hóa đơn nào đang lệch, lệch ở chỉ tiêu nào, chênh lệch bao nhiêu tiền.

Nguồn dữ liệu
Nguồn 1: Dữ liệu từ Thuế
File Excel bảng kê hóa đơn mua vào.
File Excel bảng kê hóa đơn bán ra.
Có thể khác định dạng cột theo từng thời kỳ.
Nguồn 2: Dữ liệu từ EasyBooks
File Excel xuất từ phần mềm EasyBooks.
Có thể gồm nhiều sheet.
Dữ liệu hóa đơn đầu vào hoặc đầu ra.
Chức năng tải dữ liệu
Cho phép kéo thả hoặc chọn file Excel.
Hỗ trợ định dạng XLSX và XLS.
Tự động nhận diện sheet chứa dữ liệu.
Cho phép người dùng ánh xạ (mapping) cột nếu tên cột khác nhau.
Quy tắc đối chiếu

Ưu tiên đối chiếu theo:

Số hóa đơn.
Ký hiệu hóa đơn.
Mã số thuế.
Ngày hóa đơn.

Nếu số hóa đơn trùng thì tiếp tục kiểm tra toàn bộ dữ liệu chi tiết.

Các trường cần so sánh
Số hóa đơn.
Ký hiệu hóa đơn.
Ngày hóa đơn.
Mã số thuế.
Tên khách hàng.
Tiền hàng trước thuế.
Thuế GTGT.
Tổng tiền thanh toán.
Thuế suất.
Loại hóa đơn.
Trạng thái hóa đơn.
Kết quả đối chiếu
Nhóm 1: Khớp hoàn toàn

Hiển thị:

Số hóa đơn.
Mã số thuế.
Tổng tiền.
Trạng thái: KHỚP.
Nhóm 2: Có trên Thuế nhưng không có trên EasyBooks

Hiển thị:

Số hóa đơn.
Ngày hóa đơn.
Mã số thuế.
Tổng tiền.

Trạng thái:

"Không tìm thấy trên EasyBooks"

Nhóm 3: Có trên EasyBooks nhưng không có trên Thuế

Hiển thị:

Số hóa đơn.
Ngày hóa đơn.
Mã số thuế.
Tổng tiền.

Trạng thái:

"Không tìm thấy trên dữ liệu Thuế"

Nhóm 4: Có ở cả hai nơi nhưng bị lệch

Hiển thị chi tiết:

Số hóa đơn.
Ký hiệu.
MST.
Ngày hóa đơn.

Giá trị bên Thuế.

Giá trị bên EasyBooks.

Chênh lệch.

Ví dụ:

Tiền hàng:
Thuế: 12.500.000
EasyBooks: 12.000.000
Lệch: +500.000

Thuế GTGT:
Thuế: 1.250.000
EasyBooks: 1.200.000
Lệch: +50.000

Tổng tiền:
Thuế: 13.750.000
EasyBooks: 13.200.000
Lệch: +550.000

Dashboard tổng quan

Hiển thị:

Tổng số hóa đơn Thuế.
Tổng số hóa đơn EasyBooks.
Số hóa đơn khớp.
Số hóa đơn lệch.
Số hóa đơn thiếu.
Tổng tiền hàng lệch.
Tổng tiền thuế lệch.
Tổng tiền thanh toán lệch.

Biểu đồ:

Biểu đồ cột.
Biểu đồ tròn.
Thống kê theo tháng.
Bộ lọc

Cho phép lọc theo:

Tháng.
Quý.
Năm.
MST.
Tên khách hàng.
Số hóa đơn.
Khoảng tiền.
Trạng thái khớp/lệch.
Tìm kiếm nhanh

Ô tìm kiếm hỗ trợ:

Số hóa đơn.
MST.
Tên đơn vị.

Tìm kiếm thời gian thực.

Xuất báo cáo

Cho phép xuất Excel gồm:

Sheet 1: Hóa đơn khớp.

Sheet 2: Hóa đơn lệch.

Sheet 3: Có trên Thuế nhưng thiếu trên EasyBooks.

Sheet 4: Có trên EasyBooks nhưng thiếu trên Thuế.

Sheet 5: Tổng hợp chênh lệch.

Hiệu năng
Xử lý tối thiểu 50.000 hóa đơn.
Tốc độ đối chiếu dưới 10 giây.
Tối ưu bằng HashMap/Dictionary theo số hóa đơn.
Hỗ trợ dữ liệu lớn mà không bị treo trình duyệt.
Công nghệ đề xuất

Backend:

Python Flask hoặc FastAPI.

Frontend:

HTML5.
CSS3.
Bootstrap.
JavaScript.
DataTables.

Xử lý Excel:

Pandas.
OpenPyXL.

Database:

SQLite hoặc SQL Server.
Thuật toán đối chiếu
Đọc dữ liệu từ hai file Excel.
Chuẩn hóa dữ liệu:
Bỏ khoảng trắng.
Chuẩn hóa định dạng ngày.
Chuẩn hóa định dạng số.
Tạo khóa:
Ký hiệu + Số hóa đơn + MST.
Lập chỉ mục bằng Dictionary.
Đối chiếu từng hóa đơn.
Ghi nhận chênh lệch.
Tính tổng giá trị lệch.
Hiển thị báo cáo.
Xuất Excel.
Yêu cầu bổ sung
Có chế độ nền sáng/tối.
Giao diện tiếng Việt.
Responsive trên máy tính và điện thoại.
Có phân quyền người dùng.
Lưu lịch sử các lần đối chiếu.
Cho phép tải lại báo cáo cũ.
Có nhật ký ghi nhận người thực hiện đối chiếu.
Hiển thị cảnh báo đỏ đối với hóa đơn lệch tiền.
Cho phép nhấp vào hóa đơn để xem chi tiết nguyên nhân chênh lệch.
Hỗ trợ triển khai trên máy nội bộ hoặc server doanh nghiệp.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://quanvietcuongvth.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bbfe6594-eba2-47d4-b609-c47434f6c2ba).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
