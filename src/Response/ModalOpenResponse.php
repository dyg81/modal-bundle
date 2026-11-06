<?php

namespace Dyg81\ModalBundle\Response;

use Symfony\Component\HttpFoundation\JsonResponse;

class ModalOpenResponse extends JsonResponse
{
    /**
     * Open a new modal after a successful form submission.
     *
     * @param string      $modal
     *   The rendered modal HTML.
     * @param string|null $modalId
     *   The id of the modal element, or null to use the default.
     * @param int         $status
     *   The HTTP status code.
     * @param array       $headers
     *   Additional HTTP headers.
     */
    public function __construct($modal, $modalId = null, $status = 200, array $headers = [])
    {
        parent::__construct([
            'modal' => $modal,
            'modalId' => $modalId,
        ], $status, $headers);
    }

    /**
     * {@inheritdoc}
     *
     * Validates the modal protocol before encoding.
     */
    public function setData($data = [])
    {
        if (null === $data) {
            return parent::setData($data);
        }

        if (!\is_array($data)
            || !\array_key_exists('modal', $data)
            || !\is_string($data['modal'])
            || (\array_key_exists('modalId', $data) && null !== $data['modalId'] && !\is_string($data['modalId']))
        ) {
            throw new \InvalidArgumentException('ModalOpenResponse requires a "modal" string and an optional "modalId" string or null.');
        }

        return parent::setData($data);
    }

    /**
     * Creates a response from a protocol array.
     *
     * @param array|string|null $data
     * @param int               $status
     * @param array             $headers
     *
     * @return static
     */
    public static function create($data = null, $status = 200, $headers = [])
    {
        if (!\is_array($data) || !isset($data['modal']) || !\is_string($data['modal'])) {
            throw new \InvalidArgumentException('ModalOpenResponse::create() expects an array containing a "modal" string.');
        }

        return new static($data['modal'], $data['modalId'] ?? null, $status, $headers);
    }

    /**
     * Creates a response from a JSON payload.
     *
     * @param string $json
     * @param int    $status
     * @param array  $headers
     *
     * @return static
     */
    public static function fromJsonString($json, $status = 200, $headers = [])
    {
        $data = json_decode($json, true);

        if (JSON_ERROR_NONE !== json_last_error()) {
            throw new \InvalidArgumentException('Invalid JSON payload: '.json_last_error_msg());
        }

        if (!\is_array($data) || !isset($data['modal']) || !\is_string($data['modal'])) {
            throw new \InvalidArgumentException('ModalOpenResponse JSON must contain a "modal" string.');
        }

        return new static($data['modal'], $data['modalId'] ?? null, $status, $headers);
    }
}
