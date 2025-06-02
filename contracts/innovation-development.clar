;; Innovation Development Contract
;; Advances adaptive textile technology through research and development

(define-map research-projects
  { project-id: uint }
  {
    researcher: principal,
    title: (string-ascii 150),
    description: (string-ascii 500),
    target-materials: (list 10 uint),
    funding-required: uint,
    funding-received: uint,
    start-date: uint,
    expected-completion: uint,
    status: (string-ascii 50)
  }
)

(define-map research-findings
  { project-id: uint, finding-id: uint }
  {
    discovery-type: (string-ascii 100),
    impact-level: uint,
    applicable-materials: (list 10 uint),
    implementation-cost: uint,
    publication-date: uint,
    verified: bool
  }
)

(define-map innovation-patents
  { patent-id: uint }
  {
    inventor: principal,
    title: (string-ascii 150),
    description: (string-ascii 500),
    related-project: uint,
    filing-date: uint,
    status: (string-ascii 50)
  }
)

(define-data-var next-project-id uint u1)
(define-data-var next-finding-id uint u1)
(define-data-var next-patent-id uint u1)

;; Create research project
(define-public (create-research-project
  (title (string-ascii 150))
  (description (string-ascii 500))
  (target-materials (list 10 uint))
  (funding-required uint)
  (expected-completion uint))
  (let ((project-id (var-get next-project-id)))
    (map-set research-projects
      { project-id: project-id }
      {
        researcher: tx-sender,
        title: title,
        description: description,
        target-materials: target-materials,
        funding-required: funding-required,
        funding-received: u0,
        start-date: block-height,
        expected-completion: expected-completion,
        status: "proposed"
      }
    )
    (var-set next-project-id (+ project-id u1))
    (ok project-id)
  )
)

;; Fund research project
(define-public (fund-project (project-id uint) (amount uint))
  (let ((project-data (unwrap! (map-get? research-projects { project-id: project-id }) (err u500))))
    (map-set research-projects
      { project-id: project-id }
      (merge project-data
             { funding-received: (+ (get funding-received project-data) amount),
               status: (if (>= (+ (get funding-received project-data) amount) (get funding-required project-data))
                          "funded"
                          "partially-funded") })
    )
    (ok true)
  )
)

;; Record research finding
(define-public (record-finding
  (project-id uint)
  (discovery-type (string-ascii 100))
  (impact-level uint)
  (applicable-materials (list 10 uint))
  (implementation-cost uint))
  (let ((finding-id (var-get next-finding-id)))
    ;; Verify project exists and researcher is authorized
    (let ((project-data (unwrap! (map-get? research-projects { project-id: project-id }) (err u501))))
      (asserts! (is-eq tx-sender (get researcher project-data)) (err u502))

      (map-set research-findings
        { project-id: project-id, finding-id: finding-id }
        {
          discovery-type: discovery-type,
          impact-level: impact-level,
          applicable-materials: applicable-materials,
          implementation-cost: implementation-cost,
          publication-date: block-height,
          verified: false
        }
      )
      (var-set next-finding-id (+ finding-id u1))
      (ok finding-id)
    )
  )
)

;; File patent
(define-public (file-patent
  (title (string-ascii 150))
  (description (string-ascii 500))
  (related-project uint))
  (let ((patent-id (var-get next-patent-id)))
    (map-set innovation-patents
      { patent-id: patent-id }
      {
        inventor: tx-sender,
        title: title,
        description: description,
        related-project: related-project,
        filing-date: block-height,
        status: "filed"
      }
    )
    (var-set next-patent-id (+ patent-id u1))
    (ok patent-id)
  )
)

;; Get research project
(define-read-only (get-research-project (project-id uint))
  (map-get? research-projects { project-id: project-id })
)

;; Get research finding
(define-read-only (get-research-finding (project-id uint) (finding-id uint))
  (map-get? research-findings { project-id: project-id, finding-id: finding-id })
)

;; Get patent info
(define-read-only (get-patent (patent-id uint))
  (map-get? innovation-patents { patent-id: patent-id })
)
