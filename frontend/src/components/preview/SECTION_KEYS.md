# 📋 CHIAVI STATICHE SEZIONI COMMENTABILI

Questo documento elenca tutte le chiavi statiche (`section`) utilizzate per identificare le sezioni commentabili nella pagina prodotto.

## 🎯 Formato Chiave

Tutte le chiavi seguono il pattern: `snake_case` (minuscolo con underscore).

## 📝 Lista Completa Sezioni

### Sezioni Principali (Sempre Visibili)

| Chiave | Sezione | Posizione | Campo Prodotto |
|--------|---------|-----------|----------------|
| `product_name` | Nome prodotto | Header pagina, H1 | `product.nome` |
| `product_brand` | Brand | Sotto nome prodotto, H2 | `product.brand` |
| `short_description` | Short Description | Tra "DISPONIBILE" e pulsante "AGGIUNGI" | `product.shortDescription` |

### Tab "Il prodotto"

| Chiave | Sezione | Campo Prodotto |
|--------|---------|----------------|
| `product_description` | Descrizione prodotto | `product.descrizione` |

### Tab "Fornito da"

| Chiave | Sezione | Campo Prodotto |
|--------|---------|----------------|
| `supplier_info` | Informazioni fornitore | `product.fornitoDa` |

### Tab "Etichetta"

| Chiave | Sezione | Campo Prodotto |
|--------|---------|----------------|
| `inci` | INCI | `product.inci` |
| `ingredients` | Ingredienti | `product.ingredienti` |
| `disclaimer` | Disclaimer | `product.disclaimer` |

### Tab "Dettagli"

| Chiave | Sezione | Campo Prodotto |
|--------|---------|----------------|
| `sku` | SKU | `product.sku` |
| `supplier_detail` | Fornito da (dettaglio) | `product.brand` |
| `country` | Paese del produttore | `product.paese` |
| `region` | Regione del produttore | `product.regione` |
| `alcohol_content` | Gradazione alcolica | `product.gradazione` |
| `price_per_unit` | Prezzo per unità di misura | `product.prezzoPer` |

## 📊 Riepilogo Totale

**Totale sezioni commentabili: 14**

- Sezioni principali: 3
- Tab "Il prodotto": 1
- Tab "Fornito da": 1
- Tab "Etichetta": 3
- Tab "Dettagli": 6

## 🔄 Formato JSON Payload

Quando viene inviato un commento, il payload JSON ha questa struttura:

```json
{
  "product_id": "638751",
  "section": "product_name",
  "current_text": "Nome prodotto attuale",
  "comment": "Il commento dell'utente",
  "page_url": "http://localhost:5173/preview",
  "timestamp": "2026-02-18T11:45:00.000Z"
}
```

## ⚠️ Note Importanti

1. **Chiavi statiche**: Le chiavi NON devono mai cambiare, sono identificatori permanenti
2. **Case sensitive**: Tutte le chiavi sono in `snake_case` minuscolo
3. **Mappatura**: Ogni chiave corrisponde esattamente a una sezione visibile nella UI
4. **Estendibilità**: Per aggiungere nuove sezioni, aggiungere nuove chiavi seguendo lo stesso pattern

## 🚀 Uso nelle API Future

Queste chiavi possono essere utilizzate per:
- Filtrare commenti per sezione
- Generare statistiche per sezione
- Collegare commenti a Google Sheets
- Creare dashboard di revisione
