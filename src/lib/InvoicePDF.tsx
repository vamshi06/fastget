import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import { Order } from '@/types';
import path from 'path';

const DARK = '#3D3D28';
const ACCENT = '#F5A623';
const CHARCOAL = '#1C1C1E';
const SLATE = '#6B6B6E';
const LIGHT_BG = '#F5F5F5';
const BORDER = '#E5E7EB';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: CHARCOAL,
    backgroundColor: '#ffffff',
    paddingBottom: 40,
  },
  // ── Header ──
  header: {
    backgroundColor: DARK,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  headerLeft: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  headerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLogo: {
    height: 28,
    width: 28,
    marginRight: 8,
  },
  companyName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  companySub: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 3,
  },
  invoiceBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceText: {
    fontSize: 16,
    fontFamily: 'Helvetica-Oblique',
    color: DARK,
  },
  tabAccent: {
    height: 7,
    width: 108,
    backgroundColor: ACCENT,
    alignSelf: 'flex-end',
    marginBottom: 18,
  },
  // ── Content ──
  content: {
    paddingHorizontal: 28,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  billTo: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 7,
    color: SLATE,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: CHARCOAL,
    marginBottom: 2,
  },
  partyLine: {
    fontSize: 9,
    color: '#3A3A3C',
    lineHeight: 1.5,
    marginBottom: 1,
  },
  metaBlock: {
    width: 200,
    alignItems: 'flex-end',
  },
  metaNum: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: 3,
  },
  metaKey: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: CHARCOAL,
  },
  metaVal: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: CHARCOAL,
  },
  metaDividerLine: {
    borderBottomWidth: 1,
    borderBottomColor: CHARCOAL,
    width: 200,
    marginVertical: 6,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 10,
  },
  intro: {
    fontSize: 8,
    fontFamily: 'Helvetica-Oblique',
    color: SLATE,
    marginBottom: 10,
  },
  // ── Table ──
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableHeaderCell: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: CHARCOAL,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tableRowLast: {
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  tableCell: {
    fontSize: 9,
    color: CHARCOAL,
  },
  tableCellSku: {
    fontSize: 7,
    color: '#9A9A9A',
    marginTop: 2,
  },
  colItem:  { flex: 4 },
  colQty:   { flex: 1.2, textAlign: 'center' },
  colPrice: { flex: 2.2, textAlign: 'right' },
  colCost:  { flex: 2,   textAlign: 'right' },
  // ── Bottom row ──
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  paymentBlock: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  paymentLine: {
    fontSize: 9,
    color: '#3A3A3C',
    marginBottom: 2,
  },
  totalsBlock: {
    width: 220,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  totalsRowGrand: {
    backgroundColor: LIGHT_BG,
    borderBottomWidth: 0,
  },
  totalsLabel: {
    fontSize: 9,
    color: SLATE,
  },
  totalsValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: CHARCOAL,
  },
  totalsGrandLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: CHARCOAL,
  },
  totalsGrandValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: CHARCOAL,
  },
  // ── Footer ──
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: '#9A9A9A',
  },
});

function fmt(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function InvoicePDF({ order }: { order: Order }) {
  const logoPath = path.join(process.cwd(), 'public', 'fastget-logo-clear.png');

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerLogoRow}>
              <Image style={styles.headerLogo} src={logoPath} />
              <Text style={styles.companyName}>FastGet</Text>
            </View>
            <Text style={styles.companySub}>
              Rapid Construction Delivery  |  fastget.in
            </Text>
          </View>
          <View style={styles.invoiceBadge}>
            <Text style={styles.invoiceText}>Invoice</Text>
          </View>
        </View>

        {/* Yellow tab accent */}
        <View style={styles.tabAccent} />

        <View style={styles.content}>

          {/* Bill To + Meta */}
          <View style={styles.infoRow}>
            <View style={styles.billTo}>
              <Text style={styles.infoLabel}>BILL TO:</Text>
              <Text style={styles.partyName}>{order.customerName}</Text>
              <Text style={styles.partyLine}>{order.siteAddress}</Text>
              {order.landmark ? (
                <Text style={styles.partyLine}>Landmark: {order.landmark}</Text>
              ) : null}
              <Text style={styles.partyLine}>{order.customerPhone}</Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaNum}>#{order.statusToken.toUpperCase()}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Issue Date:</Text>
                <Text style={styles.metaVal}>{fmtDate(order.createdAt)}</Text>
              </View>
              {order.eta ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>ETA:</Text>
                  <Text style={styles.metaVal}>{order.eta}</Text>
                </View>
              ) : order.scheduledTime ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Scheduled:</Text>
                  <Text style={styles.metaVal}>{fmtDate(order.scheduledTime)}</Text>
                </View>
              ) : null}
              <View style={styles.metaDividerLine} />
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Total Amount Due:</Text>
                <Text style={styles.metaVal}>{fmt(order.total)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.intro}>
            This invoice has been generated for the following order placed on{' '}
            {fmtDate(order.createdAt)} at {fmtTime(order.createdAt)}.
          </Text>

          {/* Table */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colItem]}>Item</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Price / Unit</Text>
            <Text style={[styles.tableHeaderCell, styles.colCost]}>Cost</Text>
          </View>

          {order.items.map((item, i) => (
            <View
              key={i}
              style={[
                styles.tableRow,
                i === order.items.length - 1 ? styles.tableRowLast : {},
              ]}
            >
              <View style={styles.colItem}>
                <Text style={styles.tableCell}>{item.name}</Text>
                <Text style={styles.tableCellSku}>{item.sku}</Text>
              </View>
              <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{fmt(item.price)}</Text>
              <Text style={[styles.tableCell, styles.colCost]}>
                {fmt(item.price * item.quantity)}
              </Text>
            </View>
          ))}

          {/* Payment + Totals */}
          <View style={styles.bottomRow}>
            <View style={styles.paymentBlock}>
              <Text style={styles.paymentTitle}>Our Payment Methods:</Text>
              {order.paymentMethod === 'razorpay' ? (
                <>
                  <Text style={styles.paymentLine}>Online Payment (Razorpay)</Text>
                  <Text style={styles.paymentLine}>
                    Status:{' '}
                    {order.paymentStatus === 'captured' ? 'Confirmed' : 'Pending'}
                  </Text>
                </>
              ) : (
                <Text style={styles.paymentLine}>Cash on Delivery (Pay at site)</Text>
              )}
            </View>
            <View style={styles.totalsBlock}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Sub Total</Text>
                <Text style={styles.totalsValue}>{fmt(order.subtotal)}</Text>
              </View>
              <View style={[styles.totalsRow, styles.totalsRowGrand]}>
                <Text style={styles.totalsGrandLabel}>Total Due</Text>
                <Text style={styles.totalsGrandValue}>{fmt(order.total)}</Text>
              </View>
            </View>
          </View>

        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>https://fastget.in  //  Page 1</Text>
        </View>

      </Page>
    </Document>
  );
}
