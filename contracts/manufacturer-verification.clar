;; Manufacturer Verification Contract
;; Validates and manages adaptive textile producers

(define-map manufacturers
  { manufacturer-id: uint }
  {
    name: (string-ascii 100),
    verified: bool,
    certification-level: uint,
    registration-date: uint,
    total-materials: uint
  }
)

(define-map manufacturer-addresses
  { address: principal }
  { manufacturer-id: uint }
)

(define-data-var next-manufacturer-id uint u1)
(define-data-var contract-owner principal tx-sender)

;; Register new manufacturer
(define-public (register-manufacturer (name (string-ascii 100)))
  (let ((manufacturer-id (var-get next-manufacturer-id))
        (caller tx-sender))
    (asserts! (is-none (map-get? manufacturer-addresses { address: caller })) (err u100))
    (map-set manufacturers
      { manufacturer-id: manufacturer-id }
      {
        name: name,
        verified: false,
        certification-level: u0,
        registration-date: block-height,
        total-materials: u0
      }
    )
    (map-set manufacturer-addresses { address: caller } { manufacturer-id: manufacturer-id })
    (var-set next-manufacturer-id (+ manufacturer-id u1))
    (ok manufacturer-id)
  )
)

;; Verify manufacturer (admin only)
(define-public (verify-manufacturer (manufacturer-id uint) (certification-level uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u101))
    (asserts! (is-some (map-get? manufacturers { manufacturer-id: manufacturer-id })) (err u102))
    (map-set manufacturers
      { manufacturer-id: manufacturer-id }
      (merge (unwrap-panic (map-get? manufacturers { manufacturer-id: manufacturer-id }))
             { verified: true, certification-level: certification-level })
    )
    (ok true)
  )
)

;; Get manufacturer info
(define-read-only (get-manufacturer (manufacturer-id uint))
  (map-get? manufacturers { manufacturer-id: manufacturer-id })
)

;; Get manufacturer by address
(define-read-only (get-manufacturer-by-address (address principal))
  (match (map-get? manufacturer-addresses { address: address })
    manufacturer-data (map-get? manufacturers { manufacturer-id: (get manufacturer-id manufacturer-data) })
    none
  )
)

;; Check if manufacturer is verified
(define-read-only (is-verified-manufacturer (manufacturer-id uint))
  (match (map-get? manufacturers { manufacturer-id: manufacturer-id })
    manufacturer-data (get verified manufacturer-data)
    false
  )
)
