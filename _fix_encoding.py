"""
Fix double-encoding en GenerateVouchersPage.jsx - byte-level
"""
path = r'frontend\src\pages\admin\GenerateVouchersPage.jsx'

with open(path, 'rb') as f:
    data = bytearray(f.read())

# Reemplazos de byte exactos (orden: mas largos primero)
patches = [
    # 3-byte UTF-8 chars que fueron double-encoded via CP1252
    (bytes([0xC3,0xA2, 0xE2,0x82,0xAC, 0xE2,0x80,0x9D]), b'\xe2\x80\x94'),  # â€" → — (em dash)
    (bytes([0xC3,0xA2, 0xE2,0x82,0xAC, 0xE2,0x80,0x9C]), b'\xe2\x80\x93'),  # â€" → – (en dash)
    (bytes([0xC3,0xA2, 0xE2,0x82,0xAC, 0xC2,0xA2]),      b'\xe2\x80\xa2'),  # â€¢ → • (bullet)
    (bytes([0xC3,0xA2, 0xC5,0x93, 0xE2,0x80,0x9C]),      b'\xe2\x9c\x93'),  # âœ" → ✓ (check)
]

result = bytes(data)
for old, new in patches:
    result = result.replace(old, new)

# 2-byte UTF-8 chars: \xc3\x83\xc2\xXX → \xc3\xXX  y  \xc3\x82\xc2\xXX → \xc2\xXX
out = bytearray()
i = 0
while i < len(result):
    b = result
    if (i + 3 < len(b) and b[i] == 0xC3 and b[i+1] == 0x83 and b[i+2] == 0xC2):
        out.append(0xC3); out.append(b[i+3]); i += 4
    elif (i + 3 < len(b) and b[i] == 0xC3 and b[i+1] == 0x82 and b[i+2] == 0xC2):
        out.append(0xC2); out.append(b[i+3]); i += 4
    else:
        out.append(b[i]); i += 1

with open(path, 'wb') as f:
    f.write(bytes(out))

text = bytes(out).decode('utf-8')
print('Corregido! Lineas con chars especiales:')
for i, line in enumerate(text.splitlines(), 1):
    if any(c in line for c in 'áéíóúñÁÉÍÓÚÑ•—–✓'):
        print(f'  L{i}: {line.strip()[:90]}')
