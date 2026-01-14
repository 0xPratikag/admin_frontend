import { useCallback, useState } from "react";
import { getItems } from "../billingHelpers";

export default function useBillingData(api) {
  // cases
  const [cases, setCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState("");

  // case detail
  const [caseDetail, setCaseDetail] = useState(null);
  const [caseDetailLoading, setCaseDetailLoading] = useState(false);
  const [caseDetailError, setCaseDetailError] = useState("");

  // line items
  const [lineItems, setLineItems] = useState([]);
  const [lineItemsLoading, setLineItemsLoading] = useState(false);
  const [lineItemsError, setLineItemsError] = useState("");

  // invoices
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // billed map
  const [billedMap, setBilledMap] = useState({});

  // catalogs / therapies
  const [catalogs, setCatalogs] = useState({});
  const [catalogLoading, setCatalogLoading] = useState({});
  const [therapyList, setTherapyList] = useState([]);
  const [therapyLoading, setTherapyLoading] = useState(false);

  // ---------------------
  // CASES
  // ---------------------
  const fetchCases = useCallback(
    async (q = "") => {
      setCasesLoading(true);
      setCasesError("");
      try {
        const { data } = await api.get("/cases", { params: q ? { q } : undefined });
        setCases(getItems(data));
      } catch (e) {
        console.error(e);
        setCases([]);
        setCasesError("Failed to load cases.");
      } finally {
        setCasesLoading(false);
      }
    },
    [api]
  );

  const fetchCaseDetail = useCallback(
    async (cid) => {
      if (!cid) return;
      setCaseDetailLoading(true);
      setCaseDetailError("");
      try {
        const { data } = await api.get(`/cases/${cid}`);
        setCaseDetail(data?.data || data || null);
      } catch (e) {
        console.error(e);
        setCaseDetail(null);
        setCaseDetailError(e?.response?.data?.message || "Failed to load case detail.");
      } finally {
        setCaseDetailLoading(false);
      }
    },
    [api]
  );

  // ---------------------
  // LINE ITEMS
  // ---------------------
  const fetchLineItems = useCallback(
    async (cid, status = "active") => {
      if (!cid) return;
      setLineItemsLoading(true);
      setLineItemsError("");
      try {
        const { data } = await api.get(`/cases/${cid}/line-items`, {
          params: status ? { status } : undefined,
        });
        setLineItems(getItems(data));
      } catch (e) {
        console.error(e);
        setLineItems([]);
        setLineItemsError("Failed to load line items.");
      } finally {
        setLineItemsLoading(false);
      }
    },
    [api]
  );

  // ---------------------
  // INVOICES
  // ---------------------
  const fetchInvoices = useCallback(
    async (cid) => {
      if (!cid) return;
      setInvoicesLoading(true);
      try {
        const { data } = await api.get(`/cases/${cid}/invoices`);
        setInvoices(getItems(data));
      } catch (e) {
        console.error(e);
        setInvoices([]);
      } finally {
        setInvoicesLoading(false);
      }
    },
    [api]
  );

  // invoice details -> billed map
// invoice details -> billed map (keyed by CaseItem _id / caseItemId)
const hydrateBilledMap = useCallback(
  async (cid) => {
    if (!cid) return;

    try {
      const { data } = await api.get(`/cases/${cid}/invoices`);
      const list = getItems(data).slice(0, 60);

      const details = await Promise.allSettled(
        list.map((x) => {
          const invoiceId = x._id;
          return api.get(`/invoices/${invoiceId}`);
        })
      );

      const next = {};

      for (const d of details) {
        if (d.status !== "fulfilled") continue;

        // supports both: { ok:true, data: invoice } OR direct invoice
        const payload = d.value?.data;
        const inv = payload?.data || payload || null;
        if (!inv) continue;

        const invNo = inv.invoice_uid || String(inv._id || "");

        // your invoice schema has items directly
        for (const it of inv.items || []) {
          const key = String(it.caseItemId || "");
          if (!key) continue;

          if (!next[key]) next[key] = { count: 0, invoiceNumbers: [] };

          if (!next[key].invoiceNumbers.includes(invNo)) {
            next[key].invoiceNumbers.push(invNo);
            next[key].count += 1;
          }
        }
      }

      setBilledMap(next);
    } catch (e) {
      console.error("hydrateBilledMap error", e);
      setBilledMap({});
    }
  },
  [api]
);



  // ---------------------
  // Therapies / catalog
  // ---------------------
  const fetchTherapies = useCallback(async () => {
    try {
      setTherapyLoading(true);
      const res = await api.get(`/therapies`, { params: { isActive: true, limit: 500 } });
      setTherapyList(getItems(res.data));
    } catch (e) {
      console.error(e);
      setTherapyList([]);
    } finally {
      setTherapyLoading(false);
    }
  }, [api]);

  const loadCatalogForTherapy = useCallback(
    async (therapyId) => {
      const tid = String(therapyId || "");
      if (!tid) return;
      if (catalogs[tid]?.subtherapies && catalogs[tid]?.tests) return;

      try {
        setCatalogLoading((p) => ({ ...p, [tid]: true }));

        const [subsRes, testsRes] = await Promise.allSettled([
          api.get(`/therapies/${tid}/subtherapies`, { params: { isActive: true, limit: 1000 } }),
          api.get(`/therapies/${tid}/tests`, { params: { isActive: true, limit: 1000 } }),
        ]);

        const subs = subsRes.status === "fulfilled" ? getItems(subsRes.value.data) : [];
        const tts = testsRes.status === "fulfilled" ? getItems(testsRes.value.data) : [];

        setCatalogs((p) => ({
          ...p,
          [tid]: { subtherapies: subs, tests: tts },
        }));
      } catch (e) {
        console.error(e);
      } finally {
        setCatalogLoading((p) => ({ ...p, [tid]: false }));
      }
    },
    [api, catalogs]
  );

  return {
    cases,
    casesLoading,
    casesError,
    fetchCases,

    caseDetail,
    caseDetailLoading,
    caseDetailError,
    fetchCaseDetail,

    lineItems,
    lineItemsLoading,
    lineItemsError,
    fetchLineItems,

    invoices,
    invoicesLoading,
    fetchInvoices,

    billedMap,
    hydrateBilledMap,

    therapyList,
    therapyLoading,
    fetchTherapies,

    catalogs,
    catalogLoading,
    loadCatalogForTherapy,
  };
}
