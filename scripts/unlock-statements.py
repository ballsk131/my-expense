#!/usr/bin/env python3
"""ปลดล็อก PDF statement ของธนาคารแบบอัตโนมัติ

รหัสผ่านถูกอ่านจาก environment variable เท่านั้น จงใจออกแบบให้:
  - ไม่มีรหัสผ่านอยู่ในไฟล์นี้
  - ไม่มีรหัสผ่านถูกส่งผ่าน command line argument
  - ไม่มีการพิมพ์รหัสผ่านออกทาง stdout ไม่ว่ากรณีใด
  - ไม่มีการเขียนรหัสผ่านลงไฟล์ใด ๆ

ตั้งค่าตัวแปรได้ที่หน้าตั้งค่า environment ของ Claude Code
(เมนู cloud environment บนแถบหัวข้อ > Edit) ตัวแปรที่รองรับ:

    PDF_PW_ACCTST   รหัสของไฟล์กลุ่ม AcctSt_*.pdf
    PDF_PW_STMSA    รหัสของไฟล์กลุ่ม STM_SA*.pdf
    PDF_PW          รหัสสำรอง ลองเป็นชุดสุดท้ายกับทุกไฟล์

สคริปต์จะลองทุกชุดกับทุกไฟล์ จึงตั้งตัวเดียวก็ได้ถ้ารหัสเหมือนกันหมด

วิธีใช้:
    python3 scripts/unlock-statements.py <โฟลเดอร์ที่มี pdf>

ผลลัพธ์: ไฟล์ open_<ชื่อเดิม>.pdf ที่เปิดได้โดยไม่ต้องใส่รหัส
"""
import glob
import os
import sys

# cryptography ในคอนเทนเนอร์นี้ติดตั้งไม่สมบูรณ์ ต้องปิดก่อน import pypdf
# ไม่งั้น pypdf จะ import ไม่ผ่าน
sys.modules['cryptography'] = None
import pypdf  # noqa: E402

PASSWORD_VARS = ['PDF_PW_ACCTST', 'PDF_PW_STMSA', 'PDF_PW']
PREFIX = 'open_'


def load_passwords():
    """อ่านรหัสจาก environment ตามลำดับ ตัดค่าว่างและค่าซ้ำออก"""
    seen, out = set(), []
    for name in PASSWORD_VARS:
        value = os.environ.get(name, '').strip()
        if value and value not in seen:
            seen.add(value)
            out.append(value)
    return out


def unlock(path, passwords):
    """คืน (สถานะ, ข้อความ) โดยไม่เปิดเผยว่ารหัสชุดไหนใช้ได้"""
    try:
        reader = pypdf.PdfReader(path)
    except Exception as exc:
        return 'error', f'อ่านไฟล์ไม่ได้ ({type(exc).__name__})'

    if not reader.is_encrypted:
        return 'skip', 'ไม่ได้ล็อกอยู่แล้ว'

    for password in passwords:
        try:
            if reader.decrypt(password):
                break
        except Exception:
            continue
    else:
        return 'locked', 'รหัสที่ตั้งไว้ใช้ไม่ได้กับไฟล์นี้'

    out = os.path.join(os.path.dirname(path), PREFIX + os.path.basename(path))
    try:
        writer = pypdf.PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        with open(out, 'wb') as handle:
            writer.write(handle)
    except Exception as exc:
        return 'error', f'เขียนไฟล์ใหม่ไม่ได้ ({type(exc).__name__})'

    return 'ok', f'{len(reader.pages)} หน้า -> {os.path.basename(out)}'


def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else '.'
    passwords = load_passwords()
    if not passwords:
        sys.exit('ไม่พบรหัสผ่านใน environment variable: ' + ', '.join(PASSWORD_VARS))
    print(f'พบรหัส {len(passwords)} ชุด (ไม่แสดงค่า)')

    targets = [
        p for p in sorted(glob.glob(os.path.join(folder, '*.pdf')))
        if not os.path.basename(p).startswith(PREFIX)
    ]
    if not targets:
        print('ไม่พบไฟล์ PDF ที่ต้องปลดล็อก')
        return

    tally = {}
    for path in targets:
        status, message = unlock(path, passwords)
        tally[status] = tally.get(status, 0) + 1
        print(f'{os.path.basename(path):45s} {status:7s} {message}')

    print('สรุป: ' + ' · '.join(f'{k}={v}' for k, v in sorted(tally.items())))
    # ออกด้วย exit code ไม่ศูนย์ถ้ายังมีไฟล์ที่ปลดไม่ได้ เพื่อให้ routine เห็นว่าต้องแจ้งผู้ใช้
    sys.exit(1 if tally.get('locked') or tally.get('error') else 0)


if __name__ == '__main__':
    main()
