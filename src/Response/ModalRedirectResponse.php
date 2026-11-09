<?php

namespace Dyg81\ModalBundle\Response;

use Symfony\Component\HttpFoundation\JsonResponse;

class ModalRedirectResponse extends JsonResponse
{
    /**
     * Redirect to the specified url after a form inside a modal was successfully
     * submitted.
     *
     * @param string $url
     *   The url to redirect to.
     * @param int    $status
     *   The HTTP status code.
     * @param array  $headers
     *   Additional HTTP headers.
     */
    public function __construct($url, $status = 200, array $headers = [])
    {
        parent::__construct([
            'redirect' => $url,
        ], $status, $headers);
    }

    /**
     * {@inheritdoc}
     *
     * Validates the redirect protocol before encoding.
     */
    public function setData($data = [])
    {
        if (null === $data) {
            return parent::setData($data);
        }

        if (!\is_array($data)
            || !isset($data['redirect'])
            || !\is_string($data['redirect'])
        ) {
            throw new \InvalidArgumentException('ModalRedirectResponse requires a "redirect" string.');
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
        if (!\is_array($data) || !isset($data['redirect']) || !\is_string($data['redirect'])) {
            throw new \InvalidArgumentException('ModalRedirectResponse::create() expects an array containing a "redirect" string.');
        }

        return new static($data['redirect'], $status, $headers);
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
    public static function fromJsonString($json = null, $status = 200, $headers = [])
    {
        $data = json_decode($json, true);

        if (JSON_ERROR_NONE !== json_last_error()) {
            throw new \InvalidArgumentException('Invalid JSON payload: '.json_last_error_msg());
        }

        if (!\is_array($data) || !isset($data['redirect']) || !\is_string($data['redirect'])) {
            throw new \InvalidArgumentException('ModalRedirectResponse JSON must contain a "redirect" string.');
        }

        return new static($data['redirect'], $status, $headers);
    }
}
