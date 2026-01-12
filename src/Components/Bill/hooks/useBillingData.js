// src/pages/billing/hooks/useBillingData.js
import { useCallback, useState } from "react";
import { getItems } from "../billingHelpers";

export default function useBillingData(api) {
  // case selection
  const [cases, setCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState("");

  // case detail
  const [caseDetail, setCaseDetail] = useState(null);
  const [caseDetailLoading, setCaseDetailLoading] = useState(false);
  const [caseDetailError, setCaseDetailError] = useState("");

  // invoices
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // billed map
  const [billedMap, setBilledMap] = useState({});

  // catalogs
  const [catalogs, setCatalogs] = useState({}); // tid -> { subtherapies, tests }
  const [catalogLoading, setCatalogLoading] = useState({}); // tid -> bool

  const [therapyList, setTherapyList] = useState([]);
  const [therapyLoading, setTherapyLoading] = useState(false);

  const fetchCases = useCallback(
    async (q = "") => {
      setCasesLoading(true);
      setCasesError("");
      try {
        const { data } = await api.get("/search-cases", { params: q ? { q } : undefined });
        const list = Array.isArray(data) ? data : getItems(data);
        setCases(list);
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
        const { data } = await api.get(`/view-case/${cid}`);
        setCaseDetail(data || null);
      } catch (e) {
        console.error(e);
        setCaseDetail(null);
        setCaseDetailError(
          e?.response?.data?.error ||
            e?.response?.data?.message ||
            "Failed to load case detail."
        );
      } finally {
        setCaseDetailLoading(false);
      }
    },
    [api]
  );

  const fetchInvoices = useCallback(
    async (cid) => {
      if (!cid) return;
      setInvoicesLoading(true);
      try {
        const { data } = await api.get(`/cases/${cid}/invoices`);
        setInvoices(Array.isArray(data?.invoices) ? data.invoices : getItems(data));
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
  const hydrateBilledMap = useCallback(
    async (cid, makeBaseKey) => {
      if (!cid) return;
      try {
        const { data } = await api.get(`/cases/${cid}/invoices`);
        const list = Array.isArray(data?.invoices) ? data.invoices : getItems(data);
        const top = list.slice(0, 60);

        const details = await Promise.allSettled(
          top.map((x) => api.get(`/invoices/${x.invoiceId}`).then((r) => r.data))
        );

        const next = {};
        for (const d of details) {
          if (d.status !== "fulfilled") continue;
          const inv = d.value;

          const invNo = inv?.invoiceNumber || String(inv?.invoiceId || inv?._id || "");
          const versions = [];

          if (Array.isArray(inv?.current?.items)) versions.push(inv.current.items);
          if (Array.isArray(inv?.history)) {
            for (const h of inv.history) if (Array.isArray(h?.items)) versions.push(h.items);
          }

          // count unique invoiceNumbers per baseKey
          for (const items of versions) {
            for (const it of items || []) {
              const baseKey = makeBaseKey({
                type: it.type,
                itemId: it.itemId,
                subItemId: it.subItemId,
              });

              if (!next[baseKey]) next[baseKey] = { count: 0, invoiceNumbers: [] };
              if (!next[baseKey].invoiceNumbers.includes(invNo)) {
                next[baseKey].invoiceNumbers.push(invNo);
                next[baseKey].count += 1;
              }
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
