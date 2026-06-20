import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, ArrowLeft, Download, FileSpreadsheet, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/huong-dan/tai-du-lieu-thue")({
  head: () => ({
    meta: [
      { title: "Hướng dẫn tải dữ liệu hóa đơn từ Tổng cục Thuế — tra cứu hóa đơn điện tử" },
      { name: "description", content: "Hướng dẫn chi tiết tra cứu hóa đơn điện tử và tải dữ liệu từ cổng hoadondientu.gdt.gov.vn để đối chiếu với phần mềm kế toán." },
      { property: "og:title", content: "Hướng dẫn tải dữ liệu hóa đơn từ Tổng cục Thuế — tra cứu hóa đơn điện tử" },
      { property: "og:description", content: "Hướng dẫn chi tiết tra cứu hóa đơn điện tử và tải dữ liệu từ cổng hoadondientu.gdt.gov.vn để đối chiếu với phần mềm kế toán." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Hướng dẫn tải dữ liệu hóa đơn từ Tổng cục Thuế" },
      { name: "twitter:description", content: "Hướng dẫn chi tiết tra cứu hóa đơn điện tử và tải dữ liệu từ cổng hoadondientu.gdt.gov.vn." },
    ],
  }),
  component: GuidePage,
});

function GuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ScrollText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Đối chiếu Hóa Đơn từ thuế và phần mềm .</h1>
              <p className="text-xs text-muted-foreground whitespace-pre-line">
                Sản phẩm của sinh viên Trường Đại học Hùng Vương&nbsp;{"\n"}
                HVU -Quán Viết Cường&nbsp;
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Về trang chính
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <article className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hướng dẫn tải dữ liệu hóa đơn từ Tổng cục Thuế
            </h1>
            <p className="text-muted-foreground">
              Hướng dẫn chi tiết cách tra cứu hóa đơn điện tử trên cổng thông tin chính thức của Tổng cục Thuế và xuất file Excel để đối chiếu trong phần mềm.
            </p>
          </div>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Bước 1</Badge>
              <h2 className="text-lg font-semibold">Truy cập cổng thông tin hóa đơn điện tử</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Mở trình duyệt và truy cập địa chỉ chính thức của Tổng cục Thuế tại{" "}
              <a
                href="https://hoadondientu.gdt.gov.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                hoadondientu.gdt.gov.vn
                <ExternalLink className="h-3 w-3" />
              </a>
              . Đây là cổng thông tin duy nhất được cơ quan thuế cấp phép để tra cứu hóa đơn điện tử.
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Bước 2</Badge>
              <h2 className="text-lg font-semibold">Đăng nhập tài khoản doanh nghiệp</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Chọn chức năng đăng nhập dành cho tổ chức/doanh nghiệp. Nhập thông tin tài khoản mật khẩu hoặc sử dụng chữ ký số (token) đã đăng ký với cơ quan thuế. Nếu chưa có tài khoản, doanh nghiệp cần liên hệ cơ quan thuế để được cấp thông tin truy cập.
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Bước 3</Badge>
              <h2 className="text-lg font-semibold">Vào mục tra cứu hóa đơn điện tử</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sau khi đăng nhập thành công, chọn chức năng <strong>"Tra cứu hóa đơn"</strong> hoặc <strong>"Thông điệp gửi"</strong> tùy theo nhu cầu. Hệ thống cho phép tra cứu hóa đơn điện tử theo nhiều tiêu chí: mã số thuế người bán/người mua, số hóa đơn, khoảng thời gian phát hành, hoặc trạng thái hóa đơn.
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Bước 4</Badge>
              <h2 className="text-lg font-semibold">Lọc và tìm kiếm hóa đơn cần tải</h2>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>Thiết lập bộ lọc phù hợp để thu hẹp phạm vi tra cứu hóa đơn điện tử:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Chọn khoảng thời gian (ngày bắt đầu — ngày kết thúc)</li>
                <li>Chọn loại hóa đơn: hóa đơn bán ra hoặc hóa đơn mua vào</li>
                <li>Nhập mã số thuế đối tác nếu cần lọc theo đối tác cụ thể</li>
                <li>Chọn trạng thái hóa đơn nếu muốn lọc theo tình trạng xử lý</li>
              </ul>
              <p>Nhấn nút <strong>"Tìm kiếm"</strong> để hệ thống trả về danh sách hóa đơn phù hợp.</p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Bước 5</Badge>
              <h2 className="text-lg font-semibold">Xuất dữ liệu ra file Excel</h2>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>Sau khi danh sách hóa đơn hiển thị, thực hiện xuất dữ liệu:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Tích chọn các hóa đơn cần tải, hoặc chọn tất cả nếu muốn xuất toàn bộ</li>
                <li>Nhấn nút <strong>"Xuất Excel"</strong> hoặc <strong>"Tải về"</strong> trên thanh công cụ</li>
                <li>Hệ thống sẽ tạo file <code>.xlsx</code> chứa đầy đủ thông tin: số hóa đơn, ngày hóa đơn, mã số thuế, tên đối tác, tổng tiền, tiền thuế GTGT...</li>
                <li>Lưu file vào máy tính ở vị trí dễ tìm</li>
              </ul>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Bước 6</Badge>
              <h2 className="text-lg font-semibold">Sử dụng file trong phần mềm đối chiếu</h2>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>Quay lại phần mềm TaxReconcile để thực hiện đối chiếu:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Đăng nhập vào ứng dụng TaxReconcile</li>
                <li>Ở phần <strong>"Dữ liệu từ Cơ quan Thuế"</strong>, nhấn <strong>"Chọn file Excel"</strong> và chọn file vừa tải về</li>
                <li>Hệ thống tự động nhận diện sheet và ánh xạ cột dữ liệu</li>
                <li>Tải thêm file dữ liệu từ phần mềm kế toán (EasyBooks) ở cột bên cạnh</li>
                <li>Nhấn <strong>"Đối chiếu ngay"</strong> để xem kết quả so sánh chi tiết</li>
              </ul>
            </div>
          </Card>

          <div className="flex flex-col items-center gap-4 rounded-xl border bg-muted/30 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Sẵn sàng đối chiếu hóa đơn?</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Sau khi đã tải dữ liệu từ cổng thông tin thuế, sử dụng TaxReconcile để rà soát nhanh chóng các hóa đơn lệch giữa dữ liệu thuế và phần mềm kế toán.
            </p>
            <Button asChild>
              <Link to="/auth">
                <Download className="mr-2 h-4 w-4" />
                Bắt đầu đối chiếu
              </Link>
            </Button>
          </div>
        </article>
      </main>
    </div>
  );
}
