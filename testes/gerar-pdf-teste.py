#!/usr/bin/env python3
"""Gera um PDF minimo de 3 paginas (sem bibliotecas) para testar o preparar-autos:
pag. 1 e 3 identicas (anexo repetido); todas com carimbo 'Num. NNN - Pag. N' (cabecalho repetido)."""
import sys
textos = [
    "SENTENCA. Vistos. Trata-se de acao de cobranca em que a parte autora alega inadimplemento contratual e requer a condenacao da re ao pagamento do valor devido, com correcao monetaria e juros. A re contestou alegando pagamento parcial. E o relatorio. Decido.",
    "Fundamentacao. O contrato foi juntado e a assinatura nao foi impugnada. O pagamento parcial restou demonstrado pelos comprovantes. Assim, julgo parcialmente procedente o pedido para condenar a re ao pagamento do saldo remanescente, com juros desde a citacao.",
    "SENTENCA. Vistos. Trata-se de acao de cobranca em que a parte autora alega inadimplemento contratual e requer a condenacao da re ao pagamento do valor devido, com correcao monetaria e juros. A re contestou alegando pagamento parcial. E o relatorio. Decido.",
]
def linhas(t, n=70):
    out, cur = [], ""
    for w in t.split():
        if len(cur) + len(w) + 1 > n: out.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    out.append(cur); return out
objs = []
kids = []
paginas = []
for i, t in enumerate(textos):
    ops = ["BT /F1 11 Tf 50 800 Td (Num. %d - Pag. %d) Tj ET" % (98765 + i, i + 1)]
    y = 760
    for l in linhas(t):
        ops.append("BT /F1 11 Tf 50 %d Td (%s) Tj ET" % (y, l.replace("(", "").replace(")", ""))); y -= 16
    paginas.append("\n".join(ops).encode("latin-1"))
n_pag = len(paginas)
# objetos: 1 catalog, 2 pages, 3 font, depois (page, content) por pagina
corpo = []
corpo.append(b"<< /Type /Catalog /Pages 2 0 R >>")
kids = " ".join("%d 0 R" % (4 + 2 * i) for i in range(n_pag))
corpo.append(("<< /Type /Pages /Kids [%s] /Count %d >>" % (kids, n_pag)).encode())
corpo.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
for i, c in enumerate(paginas):
    corpo.append(("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents %d 0 R >>" % (5 + 2 * i)).encode())
    corpo.append(b"<< /Length %d >>\nstream\n" % len(c) + c + b"\nendstream")
saida = bytearray(b"%PDF-1.4\n")
offs = []
for i, o in enumerate(corpo):
    offs.append(len(saida))
    saida += b"%d 0 obj\n" % (i + 1) + o + b"\nendobj\n"
xref = len(saida)
saida += b"xref\n0 %d\n0000000000 65535 f \n" % (len(corpo) + 1)
for o in offs: saida += b"%010d 00000 n \n" % o
saida += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(corpo) + 1, xref)
open(sys.argv[1], "wb").write(saida)
